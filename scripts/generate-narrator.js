const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const BEACHES = [
  {name:'Fernando de Noronha',state:'PE',lat:-3.85,lon:-32.43},
  {name:'Cacimba do Padre',state:'PE',lat:-3.86,lon:-32.43},
  {name:'Jericoacoara',state:'CE',lat:-2.79,lon:-40.51},
  {name:'Praia de Pipa',state:'RN',lat:-6.23,lon:-35.05},
  {name:'Maracaípe',state:'PE',lat:-8.55,lon:-35.02},
  {name:'Praia do Cupe',state:'PE',lat:-8.48,lon:-35.01},
  {name:'Tiririca',state:'BA',lat:-14.28,lon:-38.99},
  {name:'Engenhoca',state:'BA',lat:-14.26,lon:-38.99},
  {name:'Barra de Ilhéus',state:'BA',lat:-14.78,lon:-39.04},
  {name:'Itaúnas',state:'ES',lat:-18.42,lon:-39.67},
  {name:'Saquarema',state:'RJ',lat:-22.93,lon:-42.51},
  {name:'Praia do Forte',state:'RJ',lat:-22.88,lon:-42.01},
  {name:'Praia do Peró',state:'RJ',lat:-22.84,lon:-42.07},
  {name:'Ipanema',state:'RJ',lat:-22.98,lon:-43.20},
  {name:'Arpoador',state:'RJ',lat:-22.99,lon:-43.19},
  {name:'Prainha',state:'RJ',lat:-23.04,lon:-43.51},
  {name:'Grumari',state:'RJ',lat:-23.04,lon:-43.54},
  {name:'Recreio dos Bandeirantes',state:'RJ',lat:-23.02,lon:-43.47},
  {name:'Barra da Tijuca',state:'RJ',lat:-23.01,lon:-43.36},
  {name:'Macumba',state:'RJ',lat:-23.02,lon:-43.49},
  {name:'Itacoatiara',state:'RJ',lat:-22.97,lon:-43.04},
  {name:'Geribá',state:'RJ',lat:-22.77,lon:-41.90},
  {name:'Praia Rasa',state:'RJ',lat:-22.73,lon:-41.93},
  {name:'Tombo',state:'SP',lat:-23.99,lon:-46.26},
  {name:'Pitangueiras',state:'SP',lat:-23.98,lon:-46.25},
  {name:'Barra do Sahy',state:'SP',lat:-23.74,lon:-45.53},
  {name:'Maresias',state:'SP',lat:-23.80,lon:-45.57},
  {name:'Camburi',state:'SP',lat:-23.66,lon:-45.43},
  {name:'Itamambuca',state:'SP',lat:-23.37,lon:-44.98},
  {name:'Vermelha do Norte',state:'SP',lat:-23.30,lon:-44.87},
  {name:'Domingas Dias',state:'SP',lat:-23.49,lon:-45.11},
  {name:'Praia do Bonete',state:'SP',lat:-23.83,lon:-45.35},
  {name:'Castelhanos',state:'SP',lat:-23.79,lon:-45.26},
  {name:'Massaguaçu',state:'SP',lat:-23.59,lon:-45.36},
  {name:'Ponta da Praia',state:'SP',lat:-23.98,lon:-46.30},
  {name:'Jureia',state:'SP',lat:-24.39,lon:-47.01},
  {name:'Costão do Santinho',state:'SC',lat:-27.49,lon:-48.39},
  {name:'Joaquina',state:'SC',lat:-27.63,lon:-48.44},
  {name:'Praia Mole',state:'SC',lat:-27.60,lon:-48.43},
  {name:'Campeche',state:'SC',lat:-27.67,lon:-48.49},
  {name:'Barra da Lagoa',state:'SC',lat:-27.57,lon:-48.42},
  {name:'Moçambique',state:'SC',lat:-27.55,lon:-48.41},
  {name:'Pântano do Sul',state:'SC',lat:-27.78,lon:-48.51},
  {name:'Praia da Silveira',state:'SC',lat:-28.05,lon:-48.64},
  {name:'Praia do Ferrugem',state:'SC',lat:-28.07,lon:-48.62},
  {name:'Praia do Rosa',state:'SC',lat:-28.12,lon:-48.65},
  {name:'Ibiraquera',state:'SC',lat:-28.08,lon:-48.62},
  {name:'Guarda do Embaú',state:'SC',lat:-27.82,lon:-48.60},
  {name:'Atalaia',state:'SC',lat:-26.86,lon:-48.66},
  {name:'Penha',state:'SC',lat:-26.76,lon:-48.64},
  {name:'Caiobá',state:'PR',lat:-25.83,lon:-48.54},
  {name:'Matinhos',state:'PR',lat:-25.82,lon:-48.54},
  {name:'Torres',state:'RS',lat:-29.33,lon:-49.72},
  {name:'Tramandaí',state:'RS',lat:-29.99,lon:-50.13},
  {name:'Cidreira',state:'RS',lat:-30.17,lon:-50.22},
  {name:'Arroio do Sal',state:'RS',lat:-29.56,lon:-49.89},
  {name:'Capão da Canoa',state:'RS',lat:-29.77,lon:-50.01},
];

const PERIODOS = [
  { nome: 'manha', inicio: 5, fim: 11 },
  { nome: 'tarde', inicio: 11, fim: 18 },
  { nome: 'noite', inicio: 18, fim: 23 },
];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function classifyWindDir(graus, lat) {
  // costa leste-oeste: offshore = vento de W/NW/SW
  // simplificado: offshore se vento vem de terra (entre 180-360 pra praias que olham pro leste)
  // usamos heuristica basica por lat
  const d = ((graus % 360) + 360) % 360;
  if (d >= 135 && d <= 315) return 'offshore';
  if (d >= 315 || d <= 45) return 'onshore';
  return 'lateral';
}

function wavePower(h, t) {
  return (1025 * 9.81 * 9.81 * h * h * t) / (64 * Math.PI);
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

function aggregateBlocos(marine, forecast) {
  const times = marine.hourly.time;
  const blocos = [];

  for (const p of PERIODOS) {
    // group by date
    const byDate = {};
    for (let i = 0; i < times.length; i++) {
      const t = new Date(times[i]);
      const h = t.getHours();
      if (h < p.inicio || h >= p.fim) continue;
      const dateKey = times[i].split('T')[0];
      if (!byDate[dateKey]) byDate[dateKey] = { wh: [], wp: [], wd: [], ws: [], wdir: [] };
      const d = byDate[dateKey];
      d.wh.push(parseFloat(marine.hourly.wave_height[i] || 0));
      d.wp.push(parseFloat(marine.hourly.wave_period[i] || 0));
      d.wd.push(parseFloat(marine.hourly.wave_direction[i] || 0));
      d.ws.push(parseFloat(forecast.hourly.wind_speed_10m[i] || 0));
      d.wdir.push(parseFloat(forecast.hourly.wind_direction_10m[i] || 0));
    }

    for (const [data, d] of Object.entries(byDate)) {
      const wh = avg(d.wh);
      const wp = avg(d.wp);
      const ws = avg(d.ws);
      const wdirAvg = avg(d.wdir);
      const kw = wavePower(wh, wp) / 1000;
      blocos.push({
        data,
        periodo: p.nome,
        altura_m: +wh.toFixed(2),
        periodo_s: +wp.toFixed(1),
        direcao_swell: +avg(d.wd).toFixed(0),
        vento_kmh: +ws.toFixed(1),
        vento_direcao: +wdirAvg.toFixed(0),
        vento_tipo: classifyWindDir(wdirAvg),
        energia_kw: +kw.toFixed(1),
      });
    }
  }

  return blocos.sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    const ordem = { manha: 0, tarde: 1, noite: 2 };
    return ordem[a.periodo] - ordem[b.periodo];
  });
}

async function analyzeBeach(client, beach, blocos, narratorKnowledge) {
  const prompt = `Você vai analisar as condições de surf para ${beach.name}, ${beach.state}.

Dados dos próximos 7 dias por período:
${JSON.stringify(blocos, null, 2)}

Gere a análise completa. Retorne APENAS JSON válido, sem markdown, sem texto antes ou depois:

{
  "dias": {
    "YYYY-MM-DD": {
      "manha": {
        "score": <inteiro de -5 a 5>,
        "titulo": "<máximo 5 palavras>",
        "analise": "<2 a 4 frases em português brasileiro autêntico de surf>",
        "janela": "<melhor horário ex: 6h-9h, ou null se não vale surfar>",
        "aviso": "<alerta de segurança se necessário, ou null>"
      },
      "tarde": { ... },
      "noite": { ... }
    }
  }
}

Regras de score:
5 = épico, condições raras
4 = muito bom, vale muito a pena
3 = bom, sessão agradável
2 = razoável, dá pra surfar
1 = fraco mas surfável
0 = não vale
-1 a -5 = ruim a péssimo (flat, onshore forte, perigoso)

Regras de linguagem:
- Português brasileiro coloquial de surf, sem formalidade
- Use gírias quando natural: pico, tubão, bombando, offshore, crowd, rabear, etc
- Frases curtas e diretas
- Sem travessão (—)
- Seja específico: mencione o período em segundos, a energia em kW/m, a direção do vento
- Para dias ruins seja honesto e breve
- Para dias bons seja entusiasmado mas preciso`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: narratorKnowledge,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  return JSON.parse(text);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processBeach(client, beach, narratorKnowledge, index, total) {
  console.log(`[${index}/${total}] ${beach.name}...`);
  try {
    const { marine, forecast } = await fetchBeachData(beach);
    const blocos = aggregateBlocos(marine, forecast);
    const analysis = await analyzeBeach(client, beach, blocos, narratorKnowledge);
    console.log(`  OK: ${beach.name}`);
    return { name: beach.name, data: analysis };
  } catch (err) {
    console.error(`  Erro em ${beach.name}:`, err.message);
    return { name: beach.name, data: { erro: true } };
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida');

  const client = new Anthropic({ apiKey });
  const narratorKnowledge = fs.readFileSync(
    path.join(__dirname, '../narrator-knowledge.md'),
    'utf8'
  );

  const cache = {
    generated_at: new Date().toISOString(),
    beaches: {},
  };

  const BATCH_SIZE = 5; // 5 praias em paralelo
  const total = BEACHES.length;
  console.log(`Gerando narrações para ${total} praias em lotes de ${BATCH_SIZE}...`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = BEACHES.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    console.log(`\nLote ${batchNum}/${totalBatches}: ${batch.map(b => b.name).join(', ')}`);

    const results = await Promise.all(
      batch.map((beach, j) => processBeach(client, beach, narratorKnowledge, i + j + 1, total))
    );

    for (const r of results) {
      cache.beaches[r.name] = r.data;
    }

    // pausa entre lotes pra respeitar rate limits da Anthropic
    if (i + BATCH_SIZE < total) await sleep(2000);
  }

  const outPath = path.join(__dirname, '../demo/narrator-cache.json');
  fs.writeFileSync(outPath, JSON.stringify(cache, null, 2));
  console.log(`\nConcluído. narrator-cache.json salvo em ${outPath}`);
  console.log(`Total: ${Object.keys(cache.beaches).length} praias geradas`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
