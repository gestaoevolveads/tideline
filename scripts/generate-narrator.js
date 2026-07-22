const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-sonnet-5';

/* Freio de dinheiro. O script para de gerar quando chega no teto.
   Preço do Sonnet: US$ 3 por milhão de tokens de entrada, US$ 15 por milhão de saída.
   Sem isto, "rodar mais forte" vira cheque em branco: numa rodada sem freio o script
   fez 87 chamadas e ninguém sabia quanto tinha custado. */
const BUDGET_USD = Number(process.env.BUDGET_USD) || 0;
const PRECO_IN = 3 / 1e6, PRECO_OUT = 15 / 1e6;
let gastoUSD = 0, tokensIn = 0, tokensOut = 0;
const estourouOrcamento = () => BUDGET_USD > 0 && gastoUSD >= BUDGET_USD;
// Meta de variações por condição no banco (o app roda entre elas pela data).
// Geração é incremental: nunca descarta as existentes, só completa até a meta.
const TARGET_VARIACOES = Number(process.env.TARGET_VARIACOES) || 7;
// Espalha a verba: pouco por condição e pouco por praia POR RODADA, pra o gasto pousar
// preciso (lote pequeno = freio de orçamento certeiro) e a cobertura avançar parelha em
// várias praias por vez, em vez de encher uma praia inteira e estourar o teto.
// LARGURA PRIMEIRO: 1 variação por condição por rodada, pra dar 1 narração EXATA pra o
// máximo de condições no menor tempo (mata a aproximação rápido). Depois que tudo tem ao
// menos 1, as rodadas seguintes aprofundam até a meta (variedade). Sobe pra 2+ quando o
// banco já estiver largo.
const POR_CONDICAO = Number(process.env.POR_CONDICAO) || 1; // variações novas por condição, por rodada
const POR_PRAIA = Number(process.env.POR_PRAIA) || 6;       // variações novas por praia, por rodada (espalha entre praias)

// ── Praias: fonte única em data/beaches.json (editável pelo painel admin) ──
const ALL_BEACHES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/beaches.json'), 'utf8')).beaches;
// Ordem EMBARALHADA a cada rodada (sem prioridade de região). Assim a verba diária se
// espalha parelho por TODAS as praias ao longo dos dias, sem favorecer o Rio nem nenhuma.
// Como o banco é incremental (pula o que já está na meta), cada rodada pega praias
// diferentes e a cobertura avança junto em todo lado. Cada execução é um processo novo,
// então o embaralho é fresco a cada rodada de 6h.
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const BEACHES = embaralhar(ALL_BEACHES.filter(b => b.active !== false));
// Teto de variações NOVAS por execução (proxy de orçamento). 0 = sem teto.
// Vem do env (override manual) OU do painel via Supabase (slider de ritmo).
let MAX_NEW = Number(process.env.MAX_NEW_VARIACOES) || 0;

// Config de ritmo controlada pelo painel (tabela config, chave narrator_pace).
// Chave publishable é pública por design. Leitura sem custo.
const SB_URL = 'https://efgqgfnijhkuvincxfst.supabase.co';
const SB_KEY = 'sb_publishable_dlDItMsVmfNLo1jhADYv3A_k2dV4m6i';
async function readPaceConfig() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/config?key=eq.narrator_pace&select=value`, { headers: { apikey: SB_KEY } });
    if (!r.ok) return 0;
    const rows = await r.json();
    const v = rows && rows[0] && rows[0].value;
    return v && Number(v.max_new_per_run) > 0 ? Math.round(Number(v.max_new_per_run)) : 0;
  } catch { return 0; }
}

// ── Conhecimento destilado dos livros → system prompt (com prompt caching) ──
function loadKnowledge() {
  const files = [
    'intelligence/persona.md',
    'intelligence/voice-rules.md',
    'intelligence/knowledge/01-ondas-e-previsao.md',
    'intelligence/knowledge/02-geomorfologia-e-praias.md',
    'intelligence/knowledge/03-seguranca-no-mar.md',
    'intelligence/knowledge/04-etiqueta-e-tecnica.md',
    'intelligence/knowledge/05-lingua-e-giria.md',
    'intelligence/knowledge/06-voz-do-narrador.md',
  ];
  return files
    .map(f => {
      try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
      catch { return ''; }
    })
    .filter(Boolean)
    .join('\n\n============================\n\n');
}

const PERIODOS = [
  { nome: 'manha', inicio: 5, fim: 11 },
  { nome: 'tarde', inicio: 11, fim: 18 },
  { nome: 'noite', inicio: 18, fim: 23 },
];

// ── Bússola: tokens PT (L=leste, O=oeste) → azimute ──
const COMPASS = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, L: 90, ESE: 112.5, LSE: 112.5,
  SE: 135, SSE: 157.5, S: 180, SSO: 202.5, SO: 225, OSO: 247.5, O: 270, W: 270,
  ONO: 292.5, NO: 315, NNO: 337.5,
};

function azimuthOf(str) {
  if (!str) return null;
  const toks = String(str).toUpperCase().split(/[\/\s-]+/).map(t => COMPASS[t]).filter(v => v != null);
  if (!toks.length) return null;
  // média circular
  let x = 0, y = 0;
  for (const a of toks) { const r = a * Math.PI / 180; x += Math.cos(r); y += Math.sin(r); }
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function angDist(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

// vento_from em graus (de onde o vento vem) + perfil da praia → offshore/onshore/lateral
function classifyWind(windFromDeg, beach) {
  let terralAz = azimuthOf(beach.terral);
  if (terralAz == null) {
    const faceAz = azimuthOf(beach.orientation);
    if (faceAz == null) return 'lateral';
    terralAz = (faceAz + 180) % 360; // offshore = oposto de onde a praia olha
  }
  const d = angDist(windFromDeg, terralAz);
  if (d <= 55) return 'offshore';   // terral
  if (d >= 125) return 'onshore';   // maral
  return 'lateral';
}

// Direção do swell vs janela da praia. Grosso de propósito (3 faixas): isto entra na
// chave do cache, e chave fina demais multiplica condições e atrasa o preenchimento.
function classifySwellFit(swellFromDeg, beach) {
  let best = null;
  for (const tok of (beach.swellWindow || [])) {
    const az = azimuthOf(tok);
    if (az == null) continue;
    const d = angDist(swellFromDeg, az);
    best = best == null ? d : Math.min(best, d);
  }
  if (best == null) return 'dentro'; // praia sem janela definida: não fragmenta a chave
  if (best <= 35) return 'dentro';
  if (best <= 70) return 'borda';
  return 'fora';
}
function cardeal(deg) {
  const nomes = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
  return nomes[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function wavePower(h, t) { return (1025 * 9.81 * 9.81 * h * h * t) / (64 * Math.PI); }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── Buckets: transformam números em faixas → texto reusável entre dias parecidos ──
function heightBucket(m) {
  if (m < 0.4) return 'flat';
  if (m < 0.8) return 'joelho-cintura';
  if (m < 1.2) return 'cintura-peito';
  if (m < 1.7) return 'peito-ombro';
  if (m < 2.3) return 'ombro-cabeca';
  if (m < 3.0) return 'cabeca-1.5x';
  return 'grande-2x+';
}
function periodBucket(s) {
  if (s < 7) return 'curto-vaga';
  if (s < 9) return 'medio-7a9';
  if (s < 11) return 'bom-9a11';
  if (s < 13) return 'longo-11a13';
  if (s < 15) return 'muitolongo-13a15';
  return 'epico-15+';
}
function windBucket(kmh, tipo) {
  if (kmh < 6) return 'glassy';
  const intens = kmh < 14 ? 'fraco' : kmh < 24 ? 'moderado' : 'forte';
  return `${tipo}-${intens}`;
}
function turnKey(p) { return p; }

// Tamanho em METROS aproximados, como se fala na areia. Medida por parte do corpo
// (joelho/cintura/peito/ombro/cabeça) foi BANIDA: testado com surfistas de verdade
// e todos estranharam (pedido do Hudson, jul/2026). Os IDs internos dos buckets não
// mudam (as chaves do banco dependem deles); só o texto que o modelo lê.
const FAIXA_TEXTO = {
  'flat': 'flat, praticamente sem onda',
  'joelho-cintura': 'pequeno, na casa do meio metro',
  'cintura-peito': 'perto de um metro',
  'peito-ombro': 'passando do metro, chegando a metro e meio',
  'ombro-cabeca': 'perto de dois metros',
  'cabeca-1.5x': 'uns dois metros e meio',
  'grande-2x+': 'mar bem grande, três metros ou mais',
};
const SWELL_FIT_TEXTO = {
  dentro: 'direção que entra bem nesta praia',
  borda: 'pega a praia de raspão',
  fora: 'direção que não entra direito nesta praia',
};

// O encaixe do swell entra no FIM da chave: os campos antigos ficam nas mesmas
// posições e o banco antigo continua legível pelo fallback (chave velha tem 5 partes,
// nova tem 6; p[3]=vento e p[4]=turno valem para as duas).
function conditionKey(beach, b) {
  return [
    beach.id,
    heightBucket(b.altura_m),
    periodBucket(b.periodo_s),
    windBucket(b.vento_kmh, b.vento_tipo),
    b.periodo,
    b.swell_fit || 'dentro',
  ].join('|');
}

// Acha a narração pra um bloco. Tenta a condição EXATA; se não tiver no banco,
// cai numa condição vizinha da MESMA praia, mas SÓ do MESMO TIPO DE VENTO
// (terral/lateral/maral). O vento é o que mais muda o sentido do texto: uma narração
// de terral ("parede lisa") num dia de maral é simplesmente falsa e briga com o selo
// de vento que o app mostra ao vivo. Entre as do vento certo, prefere tamanho e turno
// parecidos. Se não houver NENHUMA do vento certo, devolve null: buraco vazio é melhor
// que narração de vento errado. Os números exatos o app mostra por conta.
// Texto que cita o horário do dia: não pode cruzar de turno ("essa manhã" caindo
// na narração da noite denuncia o reuso e quebra a confiança).
// ATENÇÃO: sem \b DEPOIS de letra acentuada. O \b do JavaScript é ASCII: "manhã"
// termina em ã (não-letra pra ele) e o \b final falharia silenciosamente.
const CITA_TURNO = /\b(manh[ãa]|amanhec|tard\w*|noit|noturn|madrugada|entardecer|cedinho)|\bcedo\b/i;
function citaTurno(v) {
  return CITA_TURNO.test(`${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''} ${v.janela || ''}`);
}
// Contaminação de turno: texto que cita turnos mas NUNCA o seu próprio (ex.: "essa
// manhã" salvo numa condição de noite). Já aconteceu no banco; barra na gravação.
const TURNO_RX = [
  [/\bmanh[ãa]|\bamanhec|\bcedo\b|\bcedinho/i, 'manha'],
  [/\btard\w+|\bentardecer/i, 'tarde'],
  [/\bnoit|\bnoturn|\bmadrugada/i, 'noite'],
];
function turnoErrado(v, turno) {
  const t = `${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''} ${v.janela || ''}`;
  const citados = TURNO_RX.filter(([rx]) => rx.test(t)).map(([, nome]) => nome);
  return citados.length > 0 && !citados.includes(turno);
}

// Texto que CRAVA um número ou tamanho não pode cruzar de gaveta: narração de
// "11 segundos" servida num dia de 8s (ou "passando do metro" num mar menor) é
// mentira com selo de análise — o Hudson pegou exatamente isso na Praia do Forte.
const CITA_PERIODO = /\b\d+\s*(a\s*\d+\s*)?s(egundos)?\b|casa dos \d+|per[íi]odo/i;
const CITA_TAMANHO = /\bmetro(s|zinho)?\b|metrinho|meio metro|\bflat\b|pequen\w+|grand\w+|caixote/i;
function citaPeriodo(v) { return CITA_PERIODO.test(`${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''}`); }
function citaTamanho(v) { return CITA_TAMANHO.test(`${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''}`); }

function acharEntry(beach, b, library) {
  const exato = library.keys[conditionKey(beach, b)];
  if (exato && exato.variacoes && exato.variacoes.length) return exato;
  const pref = `${beach.id}|`;
  const h = heightBucket(b.altura_m), pb = periodBucket(b.periodo_s),
        turno = b.periodo, wtipo = b.vento_tipo;
  let melhor = null, melhorNota = -1;
  for (const k in library.keys) {
    if (!k.startsWith(pref)) continue;
    const e = library.keys[k];
    if (!e.variacoes || !e.variacoes.length) continue;
    const p = k.split('|');                          // id, altura, periodo, vento, turno[, swell]
    if ((p[3] || '').split('-')[0] !== wtipo) continue; // o VENTO tem que bater, sem exceção
    // regra geral do fallback: o que mudou de gaveta não pode estar CRAVADO no texto
    let variacoes = e.variacoes;
    if (p[4] !== turno) variacoes = variacoes.filter(v => !citaTurno(v));
    if (p[1] !== h) variacoes = variacoes.filter(v => !citaTamanho(v));
    if (p[2] !== pb) variacoes = variacoes.filter(v => !citaPeriodo(v));
    if (!variacoes.length) continue;
    let nota = 0;
    if (p[1] === h) nota += 3;                        // mesmo tamanho
    if (p[2] === pb) nota += 2;                       // mesmo período
    if (p[5] && p[5] === b.swell_fit) nota += 2;      // mesmo encaixe de swell (chaves novas)
    if (p[4] === turno) nota += 1;                    // mesmo turno
    if (nota > melhorNota) { melhorNota = nota; melhor = { variacoes }; }
  }
  return melhor;
}

async function fetchBeachData(beach, retry = 0) {
  const base = `&timezone=America%2FSao_Paulo&forecast_days=7`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${beach.lat}&longitude=${beach.lon}&hourly=wave_height,wave_period,wave_direction${base}`;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${beach.lat}&longitude=${beach.lon}&hourly=wind_speed_10m,wind_direction_10m${base}`;
  try {
    const [mRes, fRes] = await Promise.all([fetch(marineUrl), fetch(forecastUrl)]);
    if (!mRes.ok || !fRes.ok) throw new Error(`HTTP ${mRes.status}/${fRes.status}`);
    const [marine, forecast] = await Promise.all([mRes.json(), fRes.json()]);
    return { marine, forecast };
  } catch (err) {
    if (retry < 3) { await new Promise(r => setTimeout(r, 3000 * (retry + 1))); return fetchBeachData(beach, retry + 1); }
    throw err;
  }
}

function aggregateBlocos(beach, marine, forecast) {
  const times = marine.hourly.time;
  const blocos = [];
  for (const p of PERIODOS) {
    const byDate = {};
    for (let i = 0; i < times.length; i++) {
      const h = new Date(times[i]).getHours();
      if (h < p.inicio || h >= p.fim) continue;
      const dateKey = times[i].split('T')[0];
      (byDate[dateKey] ||= { wh: [], wp: [], wd: [], ws: [], wdir: [] });
      const d = byDate[dateKey];
      d.wh.push(parseFloat(marine.hourly.wave_height[i] || 0));
      d.wp.push(parseFloat(marine.hourly.wave_period[i] || 0));
      d.wd.push(parseFloat(marine.hourly.wave_direction[i] || 0));
      d.ws.push(parseFloat(forecast.hourly.wind_speed_10m[i] || 0));
      d.wdir.push(parseFloat(forecast.hourly.wind_direction_10m[i] || 0));
    }
    for (const [data, d] of Object.entries(byDate)) {
      const wh = avg(d.wh), wp = avg(d.wp), ws = avg(d.ws), wdirAvg = avg(d.wdir);
      blocos.push({
        data, periodo: p.nome,
        altura_m: +wh.toFixed(2),
        periodo_s: +wp.toFixed(1),
        direcao_swell: +avg(d.wd).toFixed(0),
        swell_fit: classifySwellFit(avg(d.wd), beach),
        vento_kmh: +ws.toFixed(1),
        vento_direcao: +wdirAvg.toFixed(0),
        vento_tipo: classifyWind(wdirAvg, beach),
        energia_kw: +(wavePower(wh, wp) / 1000).toFixed(1),
      });
    }
  }
  const ordem = { manha: 0, tarde: 1, noite: 2 };
  return blocos.sort((a, b) => a.data !== b.data ? a.data.localeCompare(b.data) : ordem[a.periodo] - ordem[b.periodo]);
}

// ── Structured output: tool que garante JSON válido (fim dos erros de parsing) ──
const TOOL = {
  name: 'salvar_narracoes',
  description: 'Salva as narrações geradas, uma entrada por condição, com a quantidade de variações de texto solicitada para cada id.',
  input_schema: {
    type: 'object',
    properties: {
      narracoes: {
        type: 'array',
        description: 'Uma entrada por condição solicitada (mesmo id).',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'o id da condição, exatamente como fornecido' },
            variacoes: {
              type: 'array',
              description: 'a quantidade de variações NOVAS pedida para este id (campo "gerar N variações"), todas com aberturas e ênfases diferentes entre si e diferentes das já existentes listadas',
              items: {
                type: 'object',
                properties: {
                  score: { type: 'integer', description: '5=épico 4=muito bom 3=bom 2=razoável 1=fraco 0=não vale; -1 a -5=ruim/perigoso' },
                  titulo: { type: 'string', description: 'máximo 6 palavras, evocativo, sem clichê' },
                  analise: { type: 'string', description: '3 a 5 frases em camadas (traduzir o que rola, o que se sente na água, a chamada honesta com uma dica). Português coloquial de surf, sem travessão.' },
                  janela: { type: ['string', 'null'], description: 'horário ex "6h-9h" ou null' },
                  aviso: { type: ['string', 'null'], description: 'alerta de segurança real ou null' },
                },
                required: ['score', 'titulo', 'analise', 'janela', 'aviso'],
              },
            },
          },
          required: ['id', 'variacoes'],
        },
      },
    },
    required: ['narracoes'],
  },
};

// Remove glitches raros do modelo: ideogramas CJK, kana/hangul, caracteres de
// controle e invisíveis (zero-width) que ocasionalmente vazam no meio da prosa.
function cleanText(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/[\u3000-\u303F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F]/g, '')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/ ([,.;:!?])/g, '$1')
    .trim();
}
// Janela sugerida SEMPRE entre 5h e 17h (regra do Hudson: o app nunca manda
// ninguém surfar de noite). Fora disso, apara pro limite; virou nada, vira null.
function clampJanela(j) {
  if (j == null) return j;
  const s = String(j);
  if (/noite|noturn|madrugada|19h|20h|21h|22h|23h/i.test(s) && !/\d{1,2}\s*h\s*[-–a]+\s*\d{1,2}\s*h/i.test(s)) return null;
  const m = s.match(/(\d{1,2})\s*h\s*[-–a]+\s*(\d{1,2})\s*h/i);
  if (!m) return /1[89]h|2\dh/.test(s) ? null : j;
  let ini = Math.max(5, parseInt(m[1], 10));
  let fim = Math.min(17, parseInt(m[2], 10));
  if (fim <= ini) return null;
  return s.replace(m[0], `${ini}h-${fim}h`);
}

function sanitizeVar(v) {
  return {
    ...v,
    titulo: cleanText(v.titulo),
    analise: cleanText(v.analise),
    janela: v.janela == null ? v.janela : clampJanela(cleanText(v.janela)),
    aviso: v.aviso == null ? v.aviso : cleanText(v.aviso),
  };
}

function beachProfileText(b) {
  return [
    `Praia: ${b.name} (${b.state})`,
    `Tipo de fundo: ${b.break}`,
    `Orientação: olha para ${b.orientation}`,
    `Janela de swell: ${(b.swellWindow || []).join(', ')}`,
    `Terral (vento offshore): ${b.terral}`,
    `Maré ideal: ${b.tide}`,
    `Nível: ${b.level}`,
    `Caráter: ${b.character}`,
  ].join('\n');
}

async function generateForBeach(client, system, beach, conditions) {
  const lista = conditions.map(c => {
    let linha = `#${c.id} | turno: ${c.turno} | altura: ~${c.altura_m}m (${FAIXA_TEXTO[c.faixa_altura] || c.faixa_altura}) | ` +
      `período: ~${c.periodo_s}s (${c.faixa_periodo}) | energia: ~${c.energia_kw} kW/m | ` +
      `vento: ${c.vento_tipo} ~${c.vento_kmh} km/h | swell: vem de ${c.swell_de} (${SWELL_FIT_TEXTO[c.swell_fit] || c.swell_fit}) | ` +
      `GERAR ${c.quantas || 2} variações NOVAS`;
    if (c.evitar && c.evitar.length) {
      linha += ` (DIFERENTES destas que já existem, não repita abertura nem ideia: ${c.evitar.map(t => `"${t}"`).join(', ')})`;
    }
    return linha;
  }).join('\n');

  const prompt = `Escreva as narrações de surf para as condições abaixo, na praia:

${beachProfileText(beach)}

CONDIÇÕES (uma entrada por id; gere a quantidade de variações NOVAS indicada em cada linha):
${lista}

REGRAS:
- PÚBLICO INICIANTE (regra central): escreva para quem NUNCA leu uma previsão. Não é proibido usar termo técnico; é proibido deixar termo técnico SOLTO. Sempre que usar "swell de sul", "terral de sudoeste", "kW/m", "período de Xs" ou graus, explique junto, simples, na mesma frase. Ex: "swell de sul, ou seja, a ondulação vem do sul e abre as ondas pro lado esquerdo"; "uns 20 kW/m de energia, que é a força da onda: a remada cansa e a descida vem com pressão"; "terral de sudoeste, o vento que vem da terra e deixa a onda lisa". Graus entram como aparte ("do sul, uns 200 graus"), nunca como a informação principal. TAMANHO DA ONDA: NUNCA cite (nada de "um metro", "meio metro", "dois metros", nem medida por parte do corpo). O app mostra o número exato do lado da narração; citar tamanho no texto só cria chance de parecer previsão errada. A faixa de altura que você recebe serve pra CALIBRAR o clima do texto (energia, peso da remada, pressão do drop, se perdoa ou cobra), jamais pra escrever medida. Teste: um iniciante entende cada palavra e sabe se vale a pena ir?
- ESTRUTURA EM CAMADAS (3 a 5 frases): (1) traduza em linguagem simples o que está rolando no mar agora; (2) descreva o que o surfista VAI SENTIR na água (a parede, a força, a lisura, a entrada); (3) feche com a chamada honesta e UMA dica concreta (prancha, horário, canto, postura). Não é um relatório de dados; é um amigo experiente lendo o mar pra você.
- Escreva o que o surfista VAI SENTIR na água, não um relatório de origem do swell.
- DIREÇÃO DO SWELL: cada condição diz de onde o swell vem e se essa direção funciona nesta praia. Use isso SÓ quando mudar a leitura (swell que entra em cheio na bancada, ou que chega de raspão e desorganizado), integrado natural na frase, como um local comentaria. Se a direção não muda nada no dia, NEM CITE. Proibido citar de forma mecânica ("swell de sul, dentro da janela") ou repetir a palavra "janela" como jargão.
- TOM: conversa de ser humano, não locutor. Gíria só onde cai natural (no máximo uma por narração); frase que você não falaria em voz alta pra um amigo na areia, reescreva.
- JANELA DE HORÁRIO: se sugerir janela, sempre entre 5h e 17h. Nunca sugerir surf depois das 17h nem de madrugada (pra noite, a janela fica vazia ou aponta o melhor horário do dia SEGUINTE de manhã).
- Detalhe com propriedade: use o conhecimento dos livros pra escolher o detalhe CERTO (por que a parede abre, por que o vento estraga, por que a maré muda tudo), sem virar aula nem encher linguiça. Cada frase carrega informação real.
- IMPORTANTE: escreva para a FAIXA da condição, não para o número decimal exato. O texto será reusado em dias com condição parecida, e o app mostra os números precisos por conta própria: por isso o texto NUNCA cita tamanho de onda (nem em metros, nem qualquer medida). Descreva o que o número não conta: a energia, o peso da remada, a pressão do drop, a exigência da onda. Pode citar o período em segundos de forma aproximada ("na casa dos 13s") e a energia de forma qualitativa.
- Use o perfil da praia (fundo, orientação, janela, maré, caráter) para contextualizar.
- NUNCA INVENTE LUGAR: só cite ponto/acidente específico (capela, pier, canto com nome, farol, restaurante, praça) se ele estiver EXPLÍCITO no caráter da praia acima. Não está escrito lá = não existe, não cite. Na dúvida, use descrição genérica ("o canto mais abrigado", "a ponta", "o trecho de dentro"). Inventar lugar destrói a confiança na precisão do app.
- Gere a QUANTIDADE de variações NOVAS pedida em cada linha (pode ser mais de 2). Todas com aberturas e ênfases diferentes entre si; nunca comece duas com a mesma palavra. Se a linha listar variações já existentes, as novas têm que ser claramente distintas delas (outra abertura, outro ângulo de leitura).
- NUNCA desincentive o surf. Se a condição está fraca, seja honesto, mas sempre aponte um ângulo legítimo (treinar remada, espuma pra iniciante, longboard, observar o banco). "Não surfe" é proibido. Exceção: risco real de segurança, aí o aviso é direto e mira o perigo.
- Sem travessão. Português coloquial brasileiro. Uma gíria técnica por frase no máximo.
- janela: horário aproveitável ("6h-9h") ou null. aviso: alerta de segurança real ou null.

Chame a ferramenta salvar_narracoes com uma entrada por id.`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'salvar_narracoes' },
    messages: [{ role: 'user', content: prompt }],
  });

  const u = resp.usage || {};
  tokensIn += (u.input_tokens || 0);
  tokensOut += (u.output_tokens || 0);
  gastoUSD = tokensIn * PRECO_IN + tokensOut * PRECO_OUT;

  const toolUse = resp.content.find(c => c.type === 'tool_use');
  if (!toolUse) throw new Error('sem tool_use na resposta');

  // O modelo às vezes devolve as narrações como TEXTO JSON em vez de lista de verdade.
  // O código antigo percorria essa string letra por letra ("for (const n of narracoes)"),
  // não achava id nenhum e salvava nada, sem reclamar. Foi assim que dois terços de uma
  // rodada viraram fumaça: o log dizia "a API respondeu 16605 itens", que eram caracteres.
  let out = toolUse.input.narracoes;
  if (typeof out === 'string') {
    try { out = JSON.parse(out); }
    catch (e) { console.log('  narrações vieram como texto e não deu pra ler:', String(out).slice(0, 80)); return []; }
  }
  if (!Array.isArray(out)) return [];
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generateForBeachRetry(client, system, beach, conditions, retry = 0) {
  try {
    return await generateForBeach(client, system, beach, conditions);
  } catch (err) {
    console.error(`  Erro em ${beach.name}: ${err.message}`);
    if (retry < 3) { await sleep(4000 * (retry + 1)); return generateForBeachRetry(client, system, beach, conditions, retry + 1); }
    return [];
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida');
  const client = new Anthropic({ apiKey });

  const knowledge = loadKnowledge();
  const system = [{
    type: 'text',
    text: `Você é o Narrador do Tideline. Escreva análises de surf a partir do conhecimento abaixo. Nunca cite as fontes; use o conhecimento na escolha do detalhe certo.\n\n${knowledge}`,
    cache_control: { type: 'ephemeral' },
  }];

  // Biblioteca acumulativa: conditionKey → { variacoes: [...] }. Cresce pra sempre; texto pago uma vez.
  const libPath = path.join(ROOT, 'intelligence/narrator-library.json');
  const library = fs.existsSync(libPath) ? JSON.parse(fs.readFileSync(libPath, 'utf8')) : { keys: {} };
  library.keys ||= {};

  const dayOfMonth = new Date().getDate();
  // Mescla no cache existente: se o download de uma praia falhar nesta rodada, ela
  // continua no cache com o que já tinha, em vez de sumir (o rebuild do zero derrubava).
  const cacheOutPath = path.join(ROOT, 'demo/narrator-cache.json');
  const cache = fs.existsSync(cacheOutPath)
    ? JSON.parse(fs.readFileSync(cacheOutPath, 'utf8'))
    : { beaches: {} };
  cache.generated_at = new Date().toISOString();
  cache.beaches ||= {};

  let hits = 0, misses = 0, apiCalls = 0, novasGeradas = 0;
  const stats = { target: TARGET_VARIACOES, beaches: [], forecastKeysSeen: new Set() };
  // ritmo do painel (só se não houver override por env). Sem config = teto seguro
  // de 30/rodada (nunca gera tudo de uma vez num run automático).
  if (!process.env.MAX_NEW_VARIACOES) { MAX_NEW = (await readPaceConfig()) || 30; }
  if (MAX_NEW) console.log(`Teto deste lote: ${MAX_NEW} variações novas. Ordem embaralhada (verba espalhada por todas as praias).`);
  else console.log('Sem teto: gera tudo que faltar até a meta.');

  for (let bi = 0; bi < BEACHES.length; bi++) {
    const beach = BEACHES[bi];
    console.log(`[${bi + 1}/${BEACHES.length}] ${beach.name}...`);
    let blocos;
    try {
      const { marine, forecast } = await fetchBeachData(beach);
      blocos = aggregateBlocos(beach, marine, forecast);
    } catch (err) {
      console.error(`  Falha ao buscar dados: ${err.message}`);
      continue;
    }

    // mapeia cada bloco → conditionKey; junta o que está ABAIXO da meta de variações
    const blocoKeys = blocos.map(b => ({ b, key: conditionKey(beach, b) }));
    const missing = [];
    const seen = new Set();
    for (const { b, key } of blocoKeys) {
      if (seen.has(key)) continue;
      const have = library.keys[key]?.variacoes?.length || 0;
      if (have >= TARGET_VARIACOES) continue;
      seen.add(key);
      const evitar = (library.keys[key]?.variacoes || []).map(v => v.titulo).filter(Boolean);
      missing.push({ b, key, id: missing.length + 1, quantas: Math.min(TARGET_VARIACOES - have, POR_CONDICAO), evitar });
    }
    // teto por praia nesta rodada: apara as condições que passarem de POR_PRAIA variações,
    // pra o lote de cada praia ficar pequeno e a verba sobrar pra outras praias.
    if (POR_PRAIA && missing.length) {
      let resta = POR_PRAIA; const cabe = [];
      for (const m of missing) {
        if (resta <= 0) break;
        m.quantas = Math.min(m.quantas, resta); resta -= m.quantas; cabe.push(m);
      }
      missing.length = 0; missing.push(...cabe);
    }

    // chegou no teto de dinheiro: para de gerar, mas continua montando o cache com o que
    // já existe (senão a rodada não publica nada e o gasto vira prejuízo puro)
    if (estourouOrcamento()) missing.length = 0;

    // teto de orçamento: apara o que exceder o restante do lote
    if (MAX_NEW && missing.length) {
      let restante = MAX_NEW - novasGeradas;
      const apara = [];
      for (const m of missing) {
        if (restante <= 0) break;
        m.quantas = Math.min(m.quantas, restante);
        restante -= m.quantas;
        apara.push(m);
      }
      missing.length = 0; missing.push(...apara);
    }

    if (missing.length) {
      // LOTE PEQUENO, E ISSO NÃO É DETALHE.
      // A resposta do modelo tem teto de 16 mil tokens. Uma rodada pediu 116 condições numa
      // chamada só (mais de 900 variações): ele não tem como caber isso na resposta, então
      // devolveu incompleto, e o código descartava em SILÊNCIO o que não vinha. Resultado:
      // US$ 2 gastos, 8 chamadas feitas, ZERO variação salva, e nenhum erro no log.
      // Cada chamada agora pede no máximo LOTE condições, e reclama alto se voltar vazia.
      const LOTE = 6;
      for (let i = 0; i < missing.length; i += LOTE) {
        if (estourouOrcamento()) break;

        const grupo = missing.slice(i, i + LOTE);
        misses += grupo.reduce((s, m) => s + m.quantas, 0);

        const conditions = grupo.map(m => ({
          id: m.id, turno: m.b.periodo, quantas: m.quantas, evitar: m.evitar,
          altura_m: m.b.altura_m, faixa_altura: heightBucket(m.b.altura_m),
          periodo_s: m.b.periodo_s, faixa_periodo: periodBucket(m.b.periodo_s),
          energia_kw: m.b.energia_kw, vento_tipo: m.b.vento_tipo, vento_kmh: m.b.vento_kmh,
          swell_de: cardeal(m.b.direcao_swell), swell_fit: m.b.swell_fit || 'dentro',
        }));

        apiCalls++;
        const narracoes = await generateForBeachRetry(client, system, beach, conditions);

        let salvasNesteLote = 0;
        for (const n of narracoes) {
          const m = grupo.find(x => x.id === n.id);
          if (m && Array.isArray(n.variacoes) && n.variacoes.length) {
            const novas = n.variacoes.map(sanitizeVar).filter(v => !turnoErrado(v, m.b.periodo));
            const antigas = library.keys[m.key]?.variacoes || [];
            library.keys[m.key] = { variacoes: antigas.concat(novas) }; // APPEND, nunca descarta
            novasGeradas += novas.length;
            salvasNesteLote += novas.length;
          }
        }

        // Falhar calado é o pior tipo de falha: gasta dinheiro e ninguém percebe.
        if (salvasNesteLote === 0) {
          console.log(`  ATENÇÃO: lote de ${grupo.length} condições em ${beach.name} voltou VAZIO ` +
                      `(a API respondeu ${narracoes.length} itens). Dinheiro gasto sem resultado.`);
        }

        await sleep(1200);
      }
    }

    // monta o cache no formato que o app já consome
    const dias = {};
    for (const { b, key } of blocoKeys) {
      const entry = acharEntry(beach, b, library);
      if (!entry || !entry.variacoes.length) continue;
      hits++;
      const vars = entry.variacoes;
      // rotaciona pela data PREVISTA (não pela data da rodada): mesma condição em
      // dias diferentes mostra variações diferentes, matando a sensação de repetição
      const dayIdx = parseInt(String(b.data).slice(-2), 10) || dayOfMonth;
      const v = vars[dayIdx % vars.length] || vars[0];
      (dias[b.data] ||= {})[b.periodo] = {
        score: v.score, titulo: v.titulo, analise: v.analise, janela: v.janela, aviso: v.aviso,
      };
    }
    cache.beaches[beach.name] = { dias };

    // estatísticas de cobertura desta praia (para o painel do admin)
    const distinct = new Set(blocoKeys.map(x => x.key));
    let cobertas = 0, noAlvo = 0;
    for (const key of distinct) {
      const have = library.keys[key]?.variacoes?.length || 0;
      if (have >= 1) cobertas++;
      if (have >= TARGET_VARIACOES) noAlvo++;
      stats.forecastKeysSeen.add(key);
    }
    stats.beaches.push({ nome: beach.name, uf: beach.state, condicoes: distinct.size, cobertas, noAlvo });
  }

  // persiste biblioteca (acumula entre execuções) e cache (lido pelo app)
  library.generated_at = new Date().toISOString();
  // Escrita verificada. O iCloud já reverteu este arquivo depois de uma rodada inteira,
  // jogando fora 1.909 variações e US$ 4. Agora: grava num temporário, valida o JSON,
  // troca de uma vez só (rename é atômico), RELÊ do disco e confere se o número bate.
  const escreverSeguro = (destino, dados) => {
    const tmp = destino + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
    JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.renameSync(tmp, destino);
    return JSON.parse(fs.readFileSync(destino, 'utf8'));
  };
  const salvo = escreverSeguro(libPath, library);
  const noDisco = Object.values(salvo.keys).reduce((s, v) => s + (v.variacoes?.length || 0), 0);
  const naMemoria = Object.values(library.keys).reduce((s, v) => s + (v.variacoes?.length || 0), 0);
  if (noDisco !== naMemoria) {
    throw new Error(`ESCRITA NAO CONFIRMADA: memoria ${naMemoria} variacoes, disco ${noDisco}`);
  }
  console.log(`Biblioteca salva e CONFERIDA: ${noDisco} variações no disco.`);
  fs.writeFileSync(path.join(ROOT, 'demo/narrator-cache.json'), JSON.stringify(cache, null, 2));

  // estatísticas para o painel: distribuição por nº de variações + cobertura da previsão
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
  let totalVariacoes = 0;
  for (const k of Object.keys(library.keys)) {
    const n = library.keys[k].variacoes?.length || 0;
    totalVariacoes += n;
    if (n >= 6) dist['6+']++; else if (n >= 1) dist[n]++;
  }
  const forecastTotal = stats.forecastKeysSeen.size;
  const forecastCobertas = [...stats.forecastKeysSeen].filter(k => (library.keys[k]?.variacoes?.length || 0) >= 1).length;
  const forecastNoAlvo = [...stats.forecastKeysSeen].filter(k => (library.keys[k]?.variacoes?.length || 0) >= TARGET_VARIACOES).length;
  const statsOut = {
    generated_at: new Date().toISOString(),
    target: TARGET_VARIACOES,
    condicoesUnicas: Object.keys(library.keys).length,
    totalVariacoes,
    distribuicao: dist,
    previsao: { total: forecastTotal, cobertas: forecastCobertas, noAlvo: forecastNoAlvo },
    praias: stats.beaches.sort((a, b) => (a.cobertas / a.condicoes) - (b.cobertas / b.condicoes)),
  };
  fs.writeFileSync(path.join(ROOT, 'demo/narrator-stats.json'), JSON.stringify(statsOut, null, 2));

  console.log(`\nConcluído. Praias: ${Object.keys(cache.beaches).length}`);
  console.log(`Chamadas à API: ${apiCalls} | condições novas geradas: ${misses} | reusos do cache: ${hits}`);
  console.log(`Biblioteca acumulada: ${Object.keys(library.keys).length} condições únicas`);
  console.log(`GASTO: US$ ${gastoUSD.toFixed(2)} (entrada ${(tokensIn/1000).toFixed(0)}k, saída ${(tokensOut/1000).toFixed(0)}k tokens)`);
  if (BUDGET_USD) console.log(`Orçamento: US$ ${BUDGET_USD.toFixed(2)} → ${estourouOrcamento() ? 'ATINGIDO, parei de gerar' : 'não estourou'}`);
}

if (require.main === module) {
  main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
}

module.exports = {
  azimuthOf, classifyWind, classifySwellFit, cardeal, heightBucket, periodBucket, windBucket,
  conditionKey, acharEntry, aggregateBlocos, fetchBeachData, BEACHES, clampJanela,
  loadKnowledge, generateForBeachRetry, MODEL,
};
