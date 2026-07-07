const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';

// Ranking WSL do Championship Tour, lido do ge.globo (fonte BR, mesma página sempre atualizada).
// Roda raro (por etapa, disparo manual). Gera JSON estático que o app lê sem servidor.

const TOOL = {
  name: 'salvar_ranking',
  description: 'Salva o ranking do Championship Tour extraído da página.',
  input_schema: {
    type: 'object',
    properties: {
      ranking: {
        type: 'array',
        description: 'Top 10 atletas na ordem do ranking.',
        items: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            name: { type: 'string', description: 'nome completo do atleta' },
            country: { type: 'string', description: 'código do país em 3 letras: BRA, USA, AUS, HAW, ZAF, FRA, PYF, JPN, CRI, etc' },
            points: { type: 'integer', description: 'pontos no ranking (número inteiro, sem separador)' },
          },
          required: ['rank', 'name', 'country', 'points'],
        },
      },
    },
    required: ['ranking'],
  },
};

async function fetchRanking(client, gender) {
  const genderPT = gender === 'women' ? 'feminino' : 'masculino';

  // PASSO 1 — pesquisa (web search), resposta em texto
  const research = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{
      role: 'user',
      content: `Pesquise o ranking MAIS RECENTE do Championship Tour ${genderPT} da WSL (World Surf League) da temporada 2026, atualizado após a última etapa disputada.

Cruze fontes brasileiras confiáveis (waves.com.br, olimpiadatododia.com.br, redbull.com/br-pt, ge.globo.com/surfe, terra.com.br/esportes/surfe, worldsurfleague.com). Prefira a notícia com a data mais recente ("ranking atualizado após [etapa]").

Escreva em texto o TOP 10 atual, uma linha por atleta: posição, nome completo, país e pontos.`,
    }],
  });
  const text = research.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) throw new Error(`pesquisa ${gender} vazia`);

  // PASSO 2 — estrutura o texto em JSON (ferramenta forçada, garante saída válida)
  const structured = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'salvar_ranking' },
    messages: [{
      role: 'user',
      content: `Extraia o ranking do texto abaixo e chame a ferramenta salvar_ranking com o TOP 10 na ordem correta (rank, nome completo, país em código de 3 letras: BRA, USA, AUS, HAW, ZAF, FRA, PYF, JPN, CRI, etc, e pontos como número inteiro).

TEXTO:
${text}`,
    }],
  });
  const toolUse = structured.content.find(c => c.type === 'tool_use' && c.name === 'salvar_ranking');
  if (!toolUse) throw new Error(`sem ranking ${gender}`);
  const ranking = toolUse.input.ranking || [];
  if (!ranking.length) throw new Error(`ranking ${gender} vazio`);
  return ranking;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida');
  const client = new Anthropic({ apiKey });

  for (const gender of ['men', 'women']) {
    const out = path.join(ROOT, `demo/ranking-${gender}.json`);
    try {
      const ranking = await fetchRanking(client, gender);
      // fotos vêm de arquivos locais em demo/athletes/{nome}.jpg (o app resolve),
      // por isso o JSON não carrega URL de foto.
      fs.writeFileSync(out, JSON.stringify(ranking, null, 2));
      console.log(`OK ${gender}: ${ranking.length} atletas → ${path.basename(out)}`);
    } catch (err) {
      console.error(`Erro ${gender}: ${err.message}. Mantendo JSON anterior se existir.`);
      // se falhar, NÃO sobrescreve o arquivo antigo (fallback = último ranking válido)
    }
  }
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
