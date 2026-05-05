const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  const gender = event.queryStringParameters?.gender === 'women' ? 'women' : 'men';
  const genderPT = gender === 'women' ? 'feminino' : 'masculino';

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Pesquise o ranking atual do Championship Tour ${genderPT} 2026 da WSL (worldsurfleague.com).

Retorne APENAS o JSON abaixo com os top 10, sem markdown, sem texto antes ou depois:
[
  {
    "rank": 1,
    "name": "Nome Completo do Atleta",
    "country": "BRA",
    "points": 12345,
    "photo": "URL de uma foto oficial do atleta (worldsurfleague.com ou similar)"
  }
]

Use o código do país em 3 letras (BRA, USA, AUS, HAW, etc).
Para a foto, busque uma URL de imagem real do atleta no site da WSL ou Wikipedia.`
      }]
    });

    let text = '';
    for (const block of msg.content) {
      if (block.type === 'text') { text = block.text; break; }
    }

    let ranking = [];
    try {
      ranking = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*?\]/);
      if (m) ranking = JSON.parse(m[0]);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: JSON.stringify(Array.isArray(ranking) ? ranking : []),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
