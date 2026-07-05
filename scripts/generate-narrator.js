const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';

// ── Praias: fonte única em data/beaches.json (editável pelo painel admin) ──
const ALL_BEACHES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/beaches.json'), 'utf8')).beaches;
const BEACHES = ALL_BEACHES.filter(b => b.active !== false);

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

function conditionKey(beach, b) {
  return [
    beach.id,
    heightBucket(b.altura_m),
    periodBucket(b.periodo_s),
    windBucket(b.vento_kmh, b.vento_tipo),
    b.periodo,
  ].join('|');
}

async function fetchBeachData(beach) {
  const base = `&timezone=America%2FSao_Paulo&forecast_days=7`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${beach.lat}&longitude=${beach.lon}&hourly=wave_height,wave_period,wave_direction${base}`;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${beach.lat}&longitude=${beach.lon}&hourly=wind_speed_10m,wind_direction_10m${base}`;
  const [mRes, fRes] = await Promise.all([fetch(marineUrl), fetch(forecastUrl)]);
  if (!mRes.ok || !fRes.ok) throw new Error(`HTTP error for ${beach.name}`);
  const [marine, forecast] = await Promise.all([mRes.json(), fRes.json()]);
  return { marine, forecast };
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
  description: 'Salva as narrações geradas, uma entrada por condição, cada uma com exatamente 2 variações de texto.',
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
              description: 'exatamente 2 variações do texto, com aberturas e ênfases diferentes',
              items: {
                type: 'object',
                properties: {
                  score: { type: 'integer', description: '5=épico 4=muito bom 3=bom 2=razoável 1=fraco 0=não vale; -1 a -5=ruim/perigoso' },
                  titulo: { type: 'string', description: 'máximo 5 palavras' },
                  analise: { type: 'string', description: '2-3 frases, português coloquial de surf, sem travessão' },
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
  const lista = conditions.map(c => (
    `#${c.id} | turno: ${c.turno} | altura: ~${c.altura_m}m (${c.faixa_altura}) | ` +
    `período: ~${c.periodo_s}s (${c.faixa_periodo}) | energia: ~${c.energia_kw} kW/m | ` +
    `vento: ${c.vento_tipo} ~${c.vento_kmh} km/h`
  )).join('\n');

  const prompt = `Escreva as narrações de surf para as condições abaixo, na praia:

${beachProfileText(beach)}

CONDIÇÕES (uma narração por id, cada uma com 2 variações):
${lista}

REGRAS:
- PÚBLICO INICIANTE (regra central): escreva para quem NUNCA leu uma previsão. Não é proibido usar termo técnico; é proibido deixar termo técnico SOLTO. Sempre que usar "swell de sul", "terral de sudoeste", "kW/m", "período de Xs" ou graus, explique junto, simples, na mesma frase. Ex: "swell de sul, ou seja, a ondulação vem do sul e abre as ondas pro lado esquerdo"; "uns 20 kW/m de energia, que é a força da onda: a remada cansa e a descida vem com pressão"; "terral de sudoeste, o vento que vem da terra e deixa a onda lisa". Graus entram como aparte ("do sul, uns 200 graus"), nunca como a informação principal. Tamanho sempre com âncora corporal explicada ("ombro a cabeça, na altura do seu ombro"). Teste: um iniciante entende cada palavra e sabe se vale a pena ir?
- Escreva o que o surfista VAI SENTIR na água. Não descreva de onde veio o swell.
- IMPORTANTE: escreva para a FAIXA da condição, não para o número decimal exato. O texto será reusado em dias com condição parecida, e o app mostra os números precisos por conta própria. Use âncora corporal (joelho, cintura, peito, ombro, cabeça) e descrição qualitativa. Pode citar o período em segundos de forma aproximada ("na casa dos 13s") e a energia de forma qualitativa. Evite decimais cravados como "1,82m".
- Use o perfil da praia (fundo, orientação, janela, maré, caráter) para contextualizar.
- 2 variações por condição: aberturas e ênfases diferentes, nunca comece as duas com a mesma palavra.
- NUNCA desincentive o surf. Se a condição está fraca, seja honesto, mas sempre aponte um ângulo legítimo (treinar remada, espuma pra iniciante, longboard, observar o banco). "Não surfe" é proibido. Exceção: risco real de segurança, aí o aviso é direto e mira o perigo.
- Sem travessão. Português coloquial brasileiro. Uma gíria técnica por frase no máximo.
- janela: horário aproveitável ("6h-9h") ou null. aviso: alerta de segurança real ou null.

Chame a ferramenta salvar_narracoes com uma entrada por id.`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'salvar_narracoes' },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = resp.content.find(c => c.type === 'tool_use');
  if (!toolUse) throw new Error('sem tool_use na resposta');
  return toolUse.input.narracoes || [];
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
  const cache = { generated_at: new Date().toISOString(), beaches: {} };

  let hits = 0, misses = 0, apiCalls = 0;

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

    // mapeia cada bloco → conditionKey; junta os que faltam na biblioteca
    const blocoKeys = blocos.map(b => ({ b, key: conditionKey(beach, b) }));
    const missing = [];
    const seen = new Set();
    for (const { b, key } of blocoKeys) {
      if (library.keys[key] || seen.has(key)) continue;
      seen.add(key);
      missing.push({ b, key, id: missing.length + 1 });
    }

    if (missing.length) {
      misses += missing.length;
      const conditions = missing.map(m => ({
        id: m.id, turno: m.b.periodo,
        altura_m: m.b.altura_m, faixa_altura: heightBucket(m.b.altura_m),
        periodo_s: m.b.periodo_s, faixa_periodo: periodBucket(m.b.periodo_s),
        energia_kw: m.b.energia_kw, vento_tipo: m.b.vento_tipo, vento_kmh: m.b.vento_kmh,
      }));
      apiCalls++;
      const narracoes = await generateForBeachRetry(client, system, beach, conditions);
      for (const n of narracoes) {
        const m = missing.find(x => x.id === n.id);
        if (m && Array.isArray(n.variacoes) && n.variacoes.length) {
          library.keys[m.key] = { variacoes: n.variacoes };
        }
      }
      await sleep(1500);
    }

    // monta o cache no formato que o app já consome
    const dias = {};
    for (const { b, key } of blocoKeys) {
      const entry = library.keys[key];
      if (!entry) continue;
      hits++;
      const vars = entry.variacoes;
      const v = vars[dayOfMonth % vars.length] || vars[0];
      (dias[b.data] ||= {})[b.periodo] = {
        score: v.score, titulo: v.titulo, analise: v.analise, janela: v.janela, aviso: v.aviso,
      };
    }
    cache.beaches[beach.name] = { dias };
  }

  // persiste biblioteca (acumula entre execuções) e cache (lido pelo app)
  library.generated_at = new Date().toISOString();
  fs.writeFileSync(libPath, JSON.stringify(library, null, 2));
  fs.writeFileSync(path.join(ROOT, 'demo/narrator-cache.json'), JSON.stringify(cache, null, 2));

  console.log(`\nConcluído. Praias: ${Object.keys(cache.beaches).length}`);
  console.log(`Chamadas à API: ${apiCalls} | condições novas geradas: ${misses} | reusos do cache: ${hits}`);
  console.log(`Biblioteca acumulada: ${Object.keys(library.keys).length} condições únicas`);
}

if (require.main === module) {
  main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
}

module.exports = {
  azimuthOf, classifyWind, heightBucket, periodBucket, windBucket,
  conditionKey, aggregateBlocos, fetchBeachData, BEACHES,
};
