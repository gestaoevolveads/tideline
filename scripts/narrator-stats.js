// Gera demo/narrator-stats.json escaneando a previsão atual vs a biblioteca.
// NÃO chama a Anthropic (só Open-Meteo, grátis). Serve pra atualizar o painel
// a qualquer momento sem custo.
const fs = require('fs'); const path = require('path');
const G = require('./generate-narrator.js');
const ROOT = path.join(__dirname, '..');
const TARGET = Number(process.env.TARGET_VARIACOES) || 4;
const lib = JSON.parse(fs.readFileSync(path.join(ROOT, 'intelligence/narrator-library.json'), 'utf8')).keys;

(async () => {
  const praias = []; const seen = new Set();
  for (const beach of G.BEACHES) {
    let blocos;
    try { const { marine, forecast } = await G.fetchBeachData(beach); blocos = G.aggregateBlocos(beach, marine, forecast); }
    catch (e) { console.error('skip', beach.name, e.message); continue; }
    const distinct = new Set(blocos.map(b => G.conditionKey(beach, b)));
    let cobertas = 0, noAlvo = 0;
    for (const k of distinct) { const have = lib[k]?.variacoes?.length || 0; if (have >= 1) cobertas++; if (have >= TARGET) noAlvo++; seen.add(k); }
    praias.push({ nome: beach.name, uf: beach.state, condicoes: distinct.size, cobertas, noAlvo });
    process.stdout.write('.');
  }
  const dist = { 1:0,2:0,3:0,4:0,5:0,'6+':0 }; let totalVariacoes = 0;
  for (const k of Object.keys(lib)) { const n = lib[k].variacoes?.length || 0; totalVariacoes += n; if (n>=6) dist['6+']++; else if (n>=1) dist[n]++; }
  const cob = [...seen].filter(k => (lib[k]?.variacoes?.length||0) >= 1).length;
  const alvo = [...seen].filter(k => (lib[k]?.variacoes?.length||0) >= TARGET).length;
  const out = {
    generated_at: new Date().toISOString(), target: TARGET,
    condicoesUnicas: Object.keys(lib).length, totalVariacoes, distribuicao: dist,
    previsao: { total: seen.size, cobertas: cob, noAlvo: alvo },
    praias: praias.sort((a,b)=> (a.cobertas/a.condicoes)-(b.cobertas/b.condicoes)),
  };
  fs.writeFileSync(path.join(ROOT,'demo/narrator-stats.json'), JSON.stringify(out,null,2));
  console.log('\n✅ narrator-stats.json:', out.previsao.cobertas+'/'+out.previsao.total, 'condições cobertas |', out.condicoesUnicas, 'no banco |', out.totalVariacoes, 'variações');
})();
