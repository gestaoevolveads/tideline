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
            date: { type: 'string', description: 'DD/MM/AAAA — a data em que a NOTÍCIA foi publicada, nunca a data futura de um evento que ela anuncia' },
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
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    messages: [{
      role: 'user',
      content: `Hoje é ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}. Sem essa âncora o modelo não sabe o que é "recente" e volta com notícia de meses atrás.

Pesquise as notícias de surf MAIS RECENTES que encontrar. Prioridade absoluta para os ÚLTIMOS 10 DIAS: faça buscas que incluam a data atual, o mês atual e termos como "esta semana". Só amplie a janela se realmente não houver nada. Priorizando conteúdo brasileiro. Não exija que sejam dos últimos 7 dias: traga as mais atuais disponíveis, mesmo que sejam de algumas semanas atrás. Fontes confiáveis: waves.com.br, redbull.com/br-pt, ge.globo.com/surfe, hardcoresurf.com.br, surfguru.com.br, surftime.com.br, terra.com.br/esportes/surfe.

REGRAS de seleção:
- Apenas português.
- Apenas surf: ondas, competições, atletas (feitos esportivos), cultura, segurança no mar, novas praias/picos, agenda de etapas.
- PROIBIDO: fofoca, vida pessoal/amorosa, polêmica, brigas, conteúdo adulto/violento/negativo sobre pessoas. O app é para todas as idades.
- Cada notícia precisa de URL real e verificável. Não invente links.

Liste em texto de 6 a 8 notícias reais, cada uma com: título, fonte, URL, data de PUBLICAÇÃO da notícia (DD/MM/AAAA, jamais a data futura de um evento anunciado) e um resumo de 1 frase. Traga pelo menos 6 se existirem.`,
    }],
  });
  const text = research.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  const out = path.join(ROOT, 'demo/feed.json');
  if (!text) { console.error('Pesquisa vazia. Mantendo JSON anterior.'); return; }

  // PASSO 2 — estrutura em JSON (ferramenta forçada)
  const structured = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
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
  // Higiene antes de publicar. Já saiu feed com notícia datada no FUTURO (o modelo pegava
  // a data do evento anunciado, não a da publicação) e com a ordem embaralhada. Um feed
  // que mostra o amanhã como se fosse ontem não é feed, é ficção.
  const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
  const paraData = (d) => { const [dd, mm, aa] = String(d).split('/'); return new Date(+aa, +mm - 1, +dd); };

  const cru = toolUse.input.noticias;
  const noticias = cru
    .filter(n => {
      const d = paraData(n.date);
      if (isNaN(d))  { console.log('  descartada (data ilegível):', n.date, '|', n.title); return false; }
      if (d > hoje)  { console.log('  descartada (data no futuro):', n.date, '|', n.title); return false; }
      return true;
    })
    .sort((a, b) => paraData(b.date) - paraData(a.date))    // a mais nova primeiro
    .slice(0, 8);

  if (!noticias.length) { console.error('Nada sobrou depois da filtragem. Mantendo o feed anterior.'); return; }

  fs.writeFileSync(out, JSON.stringify(noticias, null, 2));
  console.log(`OK: ${noticias.length} notícias (de ${cru.length} pesquisadas) → demo/feed.json`);
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
