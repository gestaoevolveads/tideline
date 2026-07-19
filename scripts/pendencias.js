// Lista as condições SEM narração na previsão atual, pro Claude Code escrever
// narrações direto na conversa (custo zero de API: roda no plano do Hudson).
// O job pago da nuvem continua existindo como plano B: ele só gera o que
// sobrar faltando, então os dois convivem sem pisar um no outro.
//
//   node scripts/pendencias.js [--max 60] > /tmp/pendencias.json
//
// Saída: [{ key, praia, perfil, condicao: {turno, faixa_altura, faixa_periodo,
//           energia_kw, vento_tipo, vento_kmh, swell_de, swell_fit} }]
// Ordenada por visibilidade: condições de HOJE primeiro, depois amanhã, etc.

const fs = require('fs');
const path = require('path');
const {
  BEACHES, fetchBeachData, aggregateBlocos, conditionKey,
  heightBucket, periodBucket, cardeal,
} = require('./generate-narrator');

const ROOT = path.join(__dirname, '..');
const MAX = Number((process.argv.find(a => a.startsWith('--max')) || '').split('=')[1]
  || process.argv[process.argv.indexOf('--max') + 1]) || 60;

async function main() {
  const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'intelligence/narrator-library.json'), 'utf8'));
  library.keys ||= {};
  const vistos = new Set();
  const pend = [];
  for (const beach of BEACHES) {
    let blocos;
    try {
      const { marine, forecast } = await fetchBeachData(beach);
      blocos = aggregateBlocos(beach, marine, forecast);
    } catch { continue; }
    for (const b of blocos) {
      const key = conditionKey(beach, b);
      if (vistos.has(key)) continue;
      const have = library.keys[key]?.variacoes?.length || 0;
      if (have > 0) continue;
      vistos.add(key);
      pend.push({
        key,
        data: b.data,
        praia: beach.name,
        perfil: {
          fundo: beach.break, orientacao: beach.orientation,
          janelaSwell: beach.swellWindow, terral: beach.terral,
          mare: beach.tide, nivel: beach.level, carater: beach.character,
        },
        condicao: {
          turno: b.periodo,
          altura_m: b.altura_m, faixa_altura: heightBucket(b.altura_m),
          periodo_s: b.periodo_s, faixa_periodo: periodBucket(b.periodo_s),
          energia_kw: b.energia_kw,
          vento_tipo: b.vento_tipo, vento_kmh: b.vento_kmh,
          swell_de: cardeal(b.direcao_swell), swell_fit: b.swell_fit,
        },
      });
    }
    process.stderr.write(`\r${beach.name}                    `);
  }
  // hoje primeiro: é o que o usuário está olhando agora
  pend.sort((a, b) => a.data.localeCompare(b.data));
  process.stderr.write(`\npendências: ${pend.length} (exportando ${Math.min(MAX, pend.length)})\n`);
  console.log(JSON.stringify(pend.slice(0, MAX), null, 1));
}

main().catch(e => { console.error(e); process.exit(1); });
