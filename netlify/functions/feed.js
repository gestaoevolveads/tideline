const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async () => {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Pesquise as 8 notícias mais recentes sobre surf publicadas nos últimos 7 dias, priorizando conteúdo brasileiro.

REGRAS — siga à risca:
- Apenas português
- Apenas surf: ondas, competições, atletas, cultura, segurança no mar
- PROIBIDO: fofoca, vida pessoal de atletas, polêmica, conteúdo adulto ou violento
- O app é para todas as idades (inclusive crianças)
- Prefira fontes: hardcoresurf.com.br, waves.com.br, surftime.com.br, surfguru.com.br, mundosurf.com.br

Retorne APENAS o JSON abaixo, sem markdown, sem texto antes ou depois:
[
  {
    "title": "título da notícia",
    "source": "nome do site (ex: Hardcore Surf)",
    "url": "https://...",
    "date": "DD/MM/AAAA",
    "summary": "resumo em 1 frase curta"
  }
]`
      }]
    });

    let text = '';
    for (const block of msg.content) {
      if (block.type === 'text') { text = block.text; break; }
    }

    let articles = [];
    try {
      articles = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*?\]/);
      if (m) articles = JSON.parse(m[0]);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=43200',
      },
      body: JSON.stringify(Array.isArray(articles) ? articles : []),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
