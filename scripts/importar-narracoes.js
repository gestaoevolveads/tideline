// Importa narrações escritas pelo Claude Code na conversa (custo zero de API)
// pra biblioteca, com as MESMAS validações do gerador pago. Depois rode o
// refresh-narrator.js pra recompor o cache do app.
//
//   node scripts/importar-narracoes.js /tmp/narracoes.json
//
// Formato de entrada: [{ key, variacoes: [{score, titulo, analise, janela, aviso}] }]
// Reprova (e lista) qualquer variação que quebre as regras da casa:
//   travessão, medida corporal, decimal cravado, inglês vazado, turno errado,
//   janela fora de 5h-17h (essa é reparada, não reprovada).

const fs = require('fs');
const path = require('path');
const { clampJanela } = require('./generate-narrator');

const ROOT = path.join(__dirname, '..');
const libPath = path.join(ROOT, 'intelligence/narrator-library.json');

const REGRAS = [
  [/—/, 'travessão'],
  [/\b(joelho a cintura|cintura a peito|peito a ombro|ombro a cabe|peito pra cima|quase cabe|cabe[çc]a e meia|ombros?\b)/i, 'medida corporal'],
  // tamanho é papel da métrica do app, não do texto (pedido do Hudson, jul/2026:
  // texto citando medida cria sensação de previsão errada quando o número difere)
  [/\bmetros?\b|metrinho|meio metro|metro e meio|\bcent[íi]metros?\b|\bcm\b|\bpalmos?\b/i, 'cita tamanho de onda (proibido: o app mostra o número)'],
  // energia idem: NUNCA em número (kW/quilowatts). Descreva a força qualitativa.
  [/\d+\s*(kw|quilowatts?)|\b(seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)\s+quilowatts/i, 'cita energia em número (use força qualitativa)'],
  [/[0-9]+,[0-9]+ ?(segundos?|km\/h|kW|graus)/, 'decimal cravado'],
  [/\b(only|the|with|and|strong|nice|good|clean|small|big|glassy|wave)\b/i, 'inglês vazado'],
];
const TURNO_RX = [
  [/\bmanh[ãa]|\bamanhec|\bcedo\b|\bcedinho/i, 'manha'],
  [/\btard\w+|\bentardecer/i, 'tarde'],
  [/\bnoit|\bnoturn|\bmadrugada/i, 'noite'],
];

function problema(v, turnoDaChave) {
  const t = `${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''} ${v.janela || ''}`;
  for (const [rx, nome] of REGRAS) if (rx.test(t)) return nome;
  const citados = TURNO_RX.filter(([rx]) => rx.test(t)).map(([, n]) => n);
  if (citados.length && !citados.includes(turnoDaChave)) return `cita ${citados[0]} numa condição de ${turnoDaChave}`;
  if (typeof v.score !== 'number' || v.score < 0 || v.score > 10) return 'score inválido';
  if (!v.titulo || !v.analise || v.analise.length < 120) return 'análise curta demais';
  return null;
}

const entrada = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));
library.keys ||= {};

let ok = 0, reprovadas = 0;
for (const item of entrada) {
  const turno = (item.key.split('|')[4] || '');
  const boas = [];
  for (const v of item.variacoes || []) {
    const p = problema(v, turno);
    if (p) { reprovadas++; console.log(`REPROVADA (${p}): [${item.key}] ${v.titulo}`); continue; }
    boas.push({ ...v, janela: v.janela == null ? null : clampJanela(v.janela) });
  }
  if (!boas.length) continue;
  const antigas = library.keys[item.key]?.variacoes || [];
  library.keys[item.key] = { variacoes: antigas.concat(boas) };
  ok += boas.length;
}
library.generated_at = new Date().toISOString();
fs.writeFileSync(libPath, JSON.stringify(library, null, 2));
console.log(`\nimportadas: ${ok} | reprovadas: ${reprovadas}`);
console.log('agora rode: node scripts/refresh-narrator.js');
