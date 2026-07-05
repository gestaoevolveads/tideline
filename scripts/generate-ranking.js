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
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
      TOOL,
    ],
    messages: [{
      role: 'user',
      content: `Pesquise o ranking atual do Championship Tour ${genderPT} da WSL (World Surf League) da temporada em andamento. Priorize a página do ge.globo (ge.globo/surfe), que mantém o ranking atualizado, ou o site oficial worldsurfleague.com.

Depois de encontrar, chame a ferramenta salvar_ranking com o TOP 10 na ordem correta, com nome completo, país (código de 3 letras) e pontos de cada atleta.`,
    }],
  });

  const toolUse = resp.content.find(c => c.type === 'tool_use' && c.name === 'salvar_ranking');
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
      // preserva foto se já existir no JSON anterior (fotos locais em demo/athletes/)
      fs.writeFileSync(out, JSON.stringify(ranking, null, 2));
      console.log(`OK ${gender}: ${ranking.length} atletas → ${path.basename(out)}`);
    } catch (err) {
      console.error(`Erro ${gender}: ${err.message}. Mantendo JSON anterior se existir.`);
      // se falhar, NÃO sobrescreve o arquivo antigo (fallback = último ranking válido)
    }
  }
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
