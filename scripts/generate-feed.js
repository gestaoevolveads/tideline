const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';

// Feed de notícias de surf, filtrado (sem fofoca), gerado a cada 48h.
// JSON estático que o app lê sem servidor.

const TOOL = {
  name: 'salvar_feed',
  description: 'Salva as notícias de surf selecionadas e aprovadas.',
  input_schema: {
    type: 'object',
    properties: {
      noticias: {
        type: 'array',
        description: 'Até 8 notícias recentes de surf, aprovadas pelas regras.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            source: { type: 'string', description: 'nome do site, ex: Waves, Hardcore Surf, ge.globo' },
            url: { type: 'string' },
            date: { type: 'string', description: 'DD/MM/AAAA' },
            summary: { type: 'string', description: 'resumo em 1 frase curta, PT-BR' },
          },
          required: ['title', 'source', 'url', 'date', 'summary'],
        },
      },
    },
    required: ['noticias'],
  },
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não definida');
  const client = new Anthropic({ apiKey });

  // PASSO 1 — pesquisa (web search), resposta em texto
  const research = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    messages: [{
      role: 'user',
      content: `Pesquise as notícias mais recentes de surf publicadas nos últimos 7 dias, priorizando conteúdo brasileiro. Fontes confiáveis: waves.com.br, redbull.com/br-pt, ge.globo.com/surfe, hardcoresurf.com.br, surfguru.com.br, surftime.com.br, terra.com.br/esportes/surfe.

REGRAS — só traga notícias que passem em TODAS:
- Apenas português.
- Apenas surf: ondas, competições, atletas (feitos esportivos), cultura, segurança no mar, novas praias/picos.
- PROIBIDO: fofoca, vida pessoal/amorosa, polêmica, brigas, conteúdo adulto/violento/negativo sobre pessoas. O app é para todas as idades.
- Cada notícia precisa de URL real e verificável. Não invente links.

Liste em texto até 8 notícias, cada uma com: título, fonte, URL, data (DD/MM/AAAA) e um resumo de 1 frase.`,
    }],
  });
  const text = research.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const out = path.join(ROOT, 'demo/feed.json');
  if (!text) { console.error('Pesquisa vazia. Mantendo JSON anterior.'); return; }

  // PASSO 2 — estrutura em JSON (ferramenta forçada)
  const structured = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'salvar_feed' },
    messages: [{
      role: 'user',
      content: `Extraia as notícias do texto abaixo e chame a ferramenta salvar_feed (title, source, url, date DD/MM/AAAA, summary de 1 frase). Mantenha só as que têm URL real.

TEXTO:
${text}`,
    }],
  });
  const toolUse = structured.content.find(c => c.type === 'tool_use' && c.name === 'salvar_feed');
  if (!toolUse || !Array.isArray(toolUse.input.noticias) || !toolUse.input.noticias.length) {
    console.error('Feed vazio. Mantendo JSON anterior se existir.');
    return;
  }
  fs.writeFileSync(out, JSON.stringify(toolUse.input.noticias.slice(0, 8), null, 2));
  console.log(`OK: ${toolUse.input.noticias.length} notícias → demo/feed.json`);
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
