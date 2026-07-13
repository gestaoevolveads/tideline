#!/usr/bin/env node
/* Alerta Sniper — o robô que varre o futuro e decide o que merece um aviso.
 *
 * Roda de 3 em 3 horas. Para cada praia que alguém está monitorando, olha os próximos
 * 15 dias hora a hora, pontua com o MESMO cérebro do app (tideline-core.js), agrupa as
 * horas boas em EVENTOS (um swell é um bloco de horas, não uma hora solta) e decide se
 * aquilo é notícia pra alguém.
 *
 * Três ideias sustentam isso:
 *
 * 1. CONFIANÇA. Previsão de onda a 12 dias não vale o mesmo que a de amanhã. Então todo
 *    evento nasce com um selo (radar / provável / confirmado) que depende da distância.
 *    A gente diz o que sabe E o quanto sabe. Fingir certeza seria queimar a marca.
 *
 * 2. EVOLUÇÃO. O mesmo swell é avisado uma vez quando aparece no radar, e de novo quando
 *    vira confirmado. Não é spam: é a história do swell se firmando, e é o que faz a
 *    pessoa voltar no app pra conferir.
 *
 * 3. SILÊNCIO. Se não tem nada de bom vindo, o robô não fala. Alerta que toca à toa vira
 *    alerta desligado.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC, VAPID_PRIVATE
 */

const webpush = require('web-push');
const TL = require('../demo/tideline-core.js');

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUB = process.env.VAPID_PUBLIC;
const VAPID_PRIV = process.env.VAPID_PRIVATE;

if (!SB_URL || !SB_KEY) { console.error('faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (VAPID_PUB && VAPID_PRIV) {
  webpush.setVapidDetails('mailto:gestao@evolveanuncios.com', VAPID_PUB, VAPID_PRIV);
}

const DIAS = 15;
const NOTA_MINIMA = 2;        // 2 = "condição boa". Abaixo disso não se acorda ninguém.
const HORAS_MINIMAS = 2;      // uma hora boa solta é ruído do modelo, não é sessão
const HORA_INI = 4, HORA_FIM = 19;   // ninguém surfa às 3 da manhã

/* ---------- Supabase ---------- */
async function sb(caminho, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${caminho}`, {
    ...opts,
    headers: {
      apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`,
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const corpo = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${corpo.slice(0, 200)}`);
  // O Supabase responde a um INSERT com 201 e corpo VAZIO (a linha só volta se você pedir
  // com Prefer: return=representation). Chamar .json() nisso explode com "Unexpected end
  // of JSON input", e o robô morre bem na hora de gravar o primeiro alerta.
  return corpo ? JSON.parse(corpo) : null;
}

/* ---------- previsão ---------- */
async function previsao(beach) {
  const q = `latitude=${beach.lat}&longitude=${beach.lon}&timezone=America%2FSao_Paulo&forecast_days=${DIAS}`;
  const [mar, ar] = await Promise.all([
    fetch(`https://marine-api.open-meteo.com/v1/marine?${q}&hourly=wave_height,wave_period,wave_direction`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_direction_10m`).then(r => r.json()),
  ]);
  if (!mar.hourly || !ar.hourly) throw new Error('previsão veio vazia');
  return { t: mar.hourly.time, h: mar.hourly.wave_height, p: mar.hourly.wave_period,
           wd: ar.hourly.wind_direction_10m, ws: ar.hourly.wind_speed_10m };
}

/* ---------- a inteligência ----------
   Transforma 360 horas de números em poucos eventos que valem uma frase. */
function acharEventos(prev, agora) {
  const horas = [];
  for (let i = 0; i < prev.t.length; i++) {
    const h = prev.h[i], p = prev.p[i], wd = prev.wd[i];
    if (h == null || p == null || wd == null) continue;
    const d = new Date(prev.t[i]);
    if (d <= agora) continue;                                  // passado não é alerta
    const hora = d.getHours();
    if (hora < HORA_INI || hora > HORA_FIM) continue;          // fora do horário de surfar
    const r = TL.scoreHora({ windDeg: wd, period: p, height: h });
    horas.push({ iso: prev.t[i], d, score: r.score, kw: r.kw, h, p, wd, ws: prev.ws[i], vento: r.vento });
  }

  // agrupa horas boas consecutivas do MESMO dia: isso é um evento
  const eventos = [];
  let atual = null;
  for (const x of horas) {
    const bom = x.score >= NOTA_MINIMA;
    const continua = atual && bom &&
      x.d.toDateString() === atual.horas[0].d.toDateString() &&
      (x.d - atual.horas[atual.horas.length - 1].d) <= 2 * 3600e3;   // aceita 1 buraco de hora
    if (bom && continua) atual.horas.push(x);
    else if (bom) { if (atual) eventos.push(atual); atual = { horas: [x] }; }
    else if (atual) { eventos.push(atual); atual = null; }
  }
  if (atual) eventos.push(atual);

  return eventos
    .filter(e => e.horas.length >= HORAS_MINIMAS)
    .map(e => {
      const pico = e.horas.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.kw > a.kw)) ? b : a);
      // Dias de CALENDÁRIO, não horas/24. Dividir por 24 fazia a madrugada de amanhã
      // (11h à frente) arredondar pra zero, e o alerta dizia "hoje às 04h" pra uma
      // janela que é de amanhã. Alerta que erra o dia é pior do que alerta nenhum.
      const meiaNoite = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
      const dias = Math.round((meiaNoite(pico.d) - meiaNoite(agora)) / 864e5);
      return {
        chave: `${pico.d.toISOString().slice(0, 10)}`,          // um evento por dia por praia
        inicio: e.horas[0].iso, fim: e.horas[e.horas.length - 1].iso,
        horas: e.horas.length,
        score: pico.score, kw: +pico.kw.toFixed(1),
        altura: +pico.h.toFixed(1), periodo: Math.round(pico.p),
        vento: pico.vento.label, ventoKmh: Math.round(pico.ws || 0),
        picoIso: pico.iso, dias,
        confianca: dias <= 3 ? 'confirmado' : dias <= 7 ? 'provavel' : 'radar',
      };
    })
    .sort((a, b) => a.picoIso.localeCompare(b.picoIso))
    // Um dia pode ter duas janelas boas (a manhã e o fim da tarde, com o vento virando no
    // meio). Elas nascem com a mesma chave e uma sobrescreveria a outra no banco. Fica a
    // melhor do dia, que é a que interessa a quem vai escolher a hora de ir.
    .reduce((acc, ev) => {
      const igual = acc.find(x => x.chave === ev.chave);
      if (!igual) acc.push(ev);
      else if (ev.score > igual.score || (ev.score === igual.score && ev.kw > igual.kw)) {
        acc[acc.indexOf(igual)] = ev;
      }
      return acc;
    }, []);
}

/* ---------- a frase ----------
   O tom muda com a confiança. Prometer certeza a 12 dias seria mentira. */
const DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function redigir(ev, beach) {
  const d = new Date(ev.picoIso);
  const hora = `${String(d.getHours()).padStart(2, '0')}h`;
  const quando = ev.dias === 0 ? `hoje às ${hora}`
    : ev.dias === 1 ? `amanhã às ${hora}`
    : `${DIA_SEMANA[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1}) às ${hora}`;
  const mar = `${ev.altura}m com ${ev.periodo}s`;
  const vento = ev.vento === 'Terral' ? ', com terral' : ev.vento === 'Maral' ? ', mas com maral' : '';

  if (ev.confianca === 'confirmado') {
    return {
      titulo: ev.score >= 4 ? `${beach.name} vai bombar` : `Vai dar onda ${artigo(beach)} ${beach.name}`,
      corpo: `${quando[0].toUpperCase() + quando.slice(1)}: ${mar}${vento}. ${ev.horas}h de janela.`,
    };
  }
  if (ev.confianca === 'provavel') {
    return {
      titulo: `Swell a caminho ${artigo(beach)} ${beach.name}`,
      corpo: `${quando[0].toUpperCase() + quando.slice(1)}, previsão de ${mar}${vento}. Já dá pra planejar.`,
    };
  }
  return {
    titulo: `No radar: ${beach.name}`,
    corpo: `Daqui a ${ev.dias} dias, ${quando}, o modelo vê ${mar}. Ainda pode mudar, mas fica de olho.`,
  };
}
function artigo(b) {
  const n = b.name.toLowerCase();
  if (n.startsWith('praia') || n.startsWith('barra') || n.startsWith('ilha')) return 'na';
  return 'em';
}

/* ---------- push ---------- */
async function notificar(userId, alerta) {
  if (!VAPID_PUB) return 0;
  const subs = await sb(`push_subs?user_id=eq.${userId}&select=id,endpoint,p256dh,auth`);
  let enviados = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ titulo: alerta.titulo, corpo: alerta.corpo, praia: alerta.beach, url: '/app.html' })
      );
      enviados++;
    } catch (e) {
      // 404/410 = a pessoa desinstalou ou revogou. Limpa, senão a fila entope.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await sb(`push_subs?id=eq.${s.id}`, { method: 'DELETE' });
      }
    }
  }
  return enviados;
}

/* ---------- rodada ---------- */
(async () => {
  const agora = new Date();
  const configs = await sb('sniper_config?select=user_id,praias,nota_minima,ativo&ativo=eq.true');
  if (!configs.length) { console.log('ninguém monitorando nada. nada a fazer.'); return; }

  // uma praia só é consultada uma vez, mesmo que dez pessoas a monitorem
  const praias = [...new Set(configs.flatMap(c => c.praias || []))];
  console.log(`${configs.length} pessoas monitorando ${praias.length} praias`);

  const eventosPorPraia = {};
  for (const nome of praias) {
    const beach = TL.BEACHES.find(b => b.name === nome);
    if (!beach) { console.log(`  praia desconhecida: ${nome}`); continue; }
    try {
      eventosPorPraia[nome] = { beach, eventos: acharEventos(await previsao(beach), agora) };
      console.log(`  ${nome}: ${eventosPorPraia[nome].eventos.length} eventos`);
    } catch (e) { console.log(`  ${nome}: falhou (${e.message})`); }
    await new Promise(r => setTimeout(r, 250));   // educação com a API aberta
  }

  let novos = 0, atualizados = 0, pushes = 0;
  for (const cfg of configs) {
    const nota = cfg.nota_minima ?? NOTA_MINIMA;
    for (const nome of (cfg.praias || []).slice(0, 10)) {
      const bloco = eventosPorPraia[nome];
      if (!bloco) continue;

      for (const ev of bloco.eventos.filter(e => e.score >= nota)) {
        const idEvento = `${nome}|${ev.chave}`;
        const jaTem = await sb(`sniper_alerts?user_id=eq.${cfg.user_id}&evento=eq.${encodeURIComponent(idEvento)}&select=id,confianca`);
        const anterior = jaTem[0];

        // já avisado nessa mesma confiança? então cala a boca.
        if (anterior && anterior.confianca === ev.confianca) continue;

        const texto = redigir(ev, bloco.beach);
        const linha = {
          user_id: cfg.user_id, evento: idEvento, praia: nome,
          titulo: texto.titulo, corpo: texto.corpo,
          confianca: ev.confianca, score: ev.score, dias: ev.dias,
          pico: ev.picoIso, altura: ev.altura, periodo: ev.periodo,
          vento: ev.vento, horas: ev.horas, lido: false,
          updated_at: new Date().toISOString(),
        };

        if (anterior) {
          await sb(`sniper_alerts?id=eq.${anterior.id}`, { method: 'PATCH', body: JSON.stringify(linha) });
          atualizados++;
        } else {
          await sb('sniper_alerts', { method: 'POST', body: JSON.stringify(linha) });
          novos++;
        }
        pushes += await notificar(cfg.user_id, { ...texto, beach: nome });
      }
    }
  }

  console.log(`\nnovos: ${novos} | atualizados: ${atualizados} | pushes enviados: ${pushes}`);
})().catch(e => { console.error('rodada falhou:', e.message); process.exit(1); });
