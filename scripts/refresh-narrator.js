// Limpa os fósseis do banco de narrações e reconstrói o cache que o app lê.
// NÃO chama a API (custo zero). Só remove variações que quebram regra clara
// (decimal cravado grudado em unidade técnica, e travessão) e refaz o cache a
// partir do que sobrou de bom, buscando a previsão no Open-Meteo (grátis).
//
//   node scripts/refresh-narrator.js
//
// Depois disto, a regeração (essa sim paga, generate-narrator.js) enche as
// condições que ficaram vazias, priorizando o Rio.

const fs = require('fs');
const path = require('path');
const {
  BEACHES, fetchBeachData, aggregateBlocos, conditionKey, acharEntry, clampJanela,
} = require('./generate-narrator');

const ROOT = path.join(__dirname, '..');
const libPath = path.join(ROOT, 'intelligence/narrator-library.json');
const cachePath = path.join(ROOT, 'demo/narrator-cache.json');
const TARGET = Number(process.env.TARGET_VARIACOES) || 7;

// Fóssil: o pecado inequívoco. Decimal cravado colado numa unidade técnica
// ("10,6 segundos", "18,8 quilowatts", "9,7 km/h") ou travessão.
function ehFossil(v) {
  const t = `${v.titulo || ''} ${v.analise || ''} ${v.aviso || ''}`;
  if (t.includes('—')) return true;
  if (/[0-9]+,[0-9]+ ?(segundos?|km\/h|kW|quilowatts?|metros?|graus)/.test(t)) return true;
  // medida de onda por parte do corpo: banida (pedido do Hudson, jul/2026). Pega as
  // FRASES de tamanho, não a palavra solta, pra não purgar uso legítimo em aviso
  // de segurança ("proteja a cabeça").
  // (sem \b depois de ç/acento: o \b do JS é ASCII e falharia em "cabeça")
  if (/\b(joelho a cintura|cintura a peito|peito a ombro|ombro a cabe|peito pra cima|quase cabe|cabe[çc]a e meia|meio caixote)/i.test(t)) return true;
  if (/\b(ondas?|tamanho|altura|s[ée]ries?|mar) de (joelho|cintura|peito|ombro|cabe[çc]a)/i.test(t)) return true;
  if (/\bombros?\b/i.test(t)) return true;
  // metro solto e energia em número: o app mostra os números, o texto não repete
  if (/\bmetros?\b|\bcasa do\b(?!s)|\bmar e meio\b/i.test(t)) return true;
  if (/\d+\s*(kw|quilowatts?)|\b(seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)\s+quilowatts/i.test(t)) return true;
  // vazamento de inglês no meio do português ("Only detalhe: ...", "terral strong")
  if (/\b(only|the|with|and|strong|nice|good|clean|small|big|glassy|wave)\b/i.test(t)) return true;
  return false;
}

async function main() {
  const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));
  library.keys ||= {};

  // 1) LIMPEZA
  let antes = 0, removidas = 0;
  const vazias = [];
  for (const [k, e] of Object.entries(library.keys)) {
    const vs = e.variacoes || [];
    antes += vs.length;
    const boas = vs.filter(v => !ehFossil(v));
    removidas += vs.length - boas.length;
    // repara janelas fora de 5h-17h (regra do Hudson: nunca sugerir surf à noite)
    for (const v of boas) if (v.janela != null) v.janela = clampJanela(v.janela);
    e.variacoes = boas;
    if (!boas.length) vazias.push(k);
  }
  for (const k of vazias) delete library.keys[k];
  const depois = Object.values(library.keys).reduce((s, e) => s + e.variacoes.length, 0);
  console.log(`Limpeza: ${antes} variações → ${depois} (removidas ${removidas} fósseis, ${vazias.length} condições ficaram vazias)`);
  library.generated_at = new Date().toISOString();
  fs.writeFileSync(libPath, JSON.stringify(library, null, 2));

  // 2) RECONSTRÓI O CACHE (parte do cache antigo pra não perder praia se um fetch falhar)
  const cache = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    : { beaches: {} };
  cache.generated_at = new Date().toISOString();
  cache.beaches ||= {};

  const dayOfMonth = new Date().getDate();
  let ok = 0, falhas = 0, semNarracao = 0;
  for (let i = 0; i < BEACHES.length; i++) {
    const beach = BEACHES[i];
    process.stdout.write(`[${i + 1}/${BEACHES.length}] ${beach.name}… `);
    let blocos;
    try {
      const { marine, forecast } = await fetchBeachData(beach);
      blocos = aggregateBlocos(beach, marine, forecast);
    } catch (err) {
      console.log(`falhou (${err.message}), mantém cache antigo`);
      falhas++;
      continue;
    }
    const dias = {};
    for (const b of blocos) {
      const entry = acharEntry(beach, b, library);
      if (!entry || !entry.variacoes.length) { semNarracao++; continue; }
      const vars = entry.variacoes;
      const dayIdx = parseInt(String(b.data).slice(-2), 10) || dayOfMonth;
      const v = vars[dayIdx % vars.length] || vars[0];
      (dias[b.data] ||= {})[b.periodo] = {
        score: v.score, titulo: v.titulo, analise: v.analise, janela: v.janela, aviso: v.aviso,
      };
    }
    cache.beaches[beach.name] = { dias };
    ok++;
    console.log('ok');
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  console.log(`\nCache refeito: ${ok} praias ok, ${falhas} falhas (cache antigo preservado), ${semNarracao} blocos sem narração (vão ser preenchidos na regeração).`);
}

main().catch(e => { console.error('Erro:', e); process.exit(1); });
