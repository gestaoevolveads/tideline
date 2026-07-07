# Tideline — Como colocar no ar

O site é 100% estático (HTML/CSS/JS). Zero servidor, hospedagem grátis. Os dados
(narrações, ranking, feed) são gerados por GitHub Actions e servidos como JSON estático.

## Passos para ir ao ar (uma vez)

### 1. Confirmar o secret da API
Repo → Settings → Secrets and variables → Actions → confirmar que existe
`ANTHROPIC_API_KEY`. É usado pelos 3 geradores (narrador, ranking, feed).

### 2. Gerar os dados iniciais
Rodar cada workflow uma vez em Actions → "Run workflow":
- **Gerar Narrações** → cria `demo/narrator-cache.json` (as análises das 87 praias)
- **Atualizar Ranking WSL** → `demo/ranking-men.json` / `ranking-women.json`
- **Atualizar Feed de Notícias** → `demo/feed.json`

Depois disso eles rodam sozinhos:
- Narrações: a cada 6h
- Ranking: manual por etapa (+ segurança semanal)
- Feed: a cada 48h

### 3. Ativar o site (Cloudflare Pages — repo privado)
Como o repositório é privado, hospedamos no **Cloudflare Pages** (grátis, funciona com
repo privado; o GitHub Pages gratuito exigiria repo público).

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → aba **Pages** →
   **Connect to Git** → autorizar acesso ao repo `gestaoevolveads/tideline`.
2. Build settings: **Framework preset = None**, **Build command = (vazio)**,
   **Build output directory = `demo`**. → **Save and Deploy**.
3. Sai uma URL tipo `tideline.pages.dev`. Domínio próprio depois em Custom domains.

O Cloudflare republica sozinho a cada push (inclusive os commits dos geradores).

## Estrutura do deploy (pasta demo/)
- `index.html` — landing (preços, avaliações) → CTA vai para `login.html`
- `login.html` — entrada
- `app.html` — o app (previsão, narrador, ranking, feed, diário, loja)
- `narrator-cache.json`, `ranking-*.json`, `feed.json` — dados gerados

## O que ainda depende de contas (fase 2, não bloqueia o go-live)
- **Login real + painel admin + pagamento:** Supabase (auth/dados) + Mercado Pago/Stripe.
  Ver `business/painel-controle.md` e `business/monetizacao.md`.
- Enquanto isso, o app funciona em modo aberto (sem paywall), o que é ótimo para
  validar tração antes de fechar o premium.

## Observação
As funções antigas em `netlify/functions/` (feed.js, ranking.js) estão desativadas —
foram substituídas pelos geradores estáticos em `scripts/`. Podem ser removidas.
