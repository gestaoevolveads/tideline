# Tideline — Estado do Projeto e Próximos Passos

> Documento-mestre. Serve pra retomar o trabalho a qualquer momento sem perder contexto.
> Última atualização: 05/07/2026.
> Projeto local: `/Users/Hudson/Desktop/Tideline` · Repo: https://github.com/gestaoevolveads/tideline

---

## ⚡ TL;DR — o que fazer pra colocar no ar

1. **Código já enviado** pro repo privado `gestaoevolveads/tideline`.
2. **Rodar 3 workflows** no GitHub Actions (gera narrações, ranking, feed).
3. **Ativar Cloudflare Pages** (Connect to Git, Build output = `demo`).
4. **(Depois) Ativar Supabase** pra login + painel ao vivo (ver SUPABASE.md).

---

## ✅ CÓDIGO JÁ ENVIADO

O projeto está no repositório privado **`gestaoevolveads/tideline`** (conta da Evolve).
Hospedagem: **Cloudflare Pages** (grátis, funciona com repo privado). Daqui é só seguir
os passos da Fase 1 — tudo no navegador.

---

## 🔗 LINKS — onde ir pra continuar

### GitHub (repo gestaoevolveads/tideline)
- Repositório: https://github.com/gestaoevolveads/tideline
- **Actions** (rodar os workflows): https://github.com/gestaoevolveads/tideline/actions
- **Cloudflare Pages** (publicar o site, repo privado): https://dash.cloudflare.com
- **Settings → Secrets** (a chave da API): https://github.com/gestaoevolveads/tideline/settings/secrets/actions
- Gerar token pessoal (se precisar): https://github.com/settings/tokens (escopo `repo`)

### Anthropic (a chave da IA)
- Console / API Keys: https://console.anthropic.com/settings/keys
- É a `ANTHROPIC_API_KEY` que vai no Secret do GitHub. Sem ela, os workflows não geram nada.

### Supabase (fase 2 — login + painel ao vivo)
- Criar projeto: https://supabase.com/dashboard
- Depois de criar: **SQL Editor** (rodar o schema do SUPABASE.md), **Authentication → Users**
  (criar o admin), **Settings → API** (copiar Project URL + chave anon).
- Guia passo a passo completo: arquivo **`SUPABASE.md`** na raiz do projeto.

### Cloudflare Pages (hospedagem principal — repo privado)
- https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → repo `gestaoevolveads/tideline` → Build output directory = `demo`

---

## ✅ O QUE JÁ ESTÁ PRONTO (11 commits na main local)

### Inteligência do narrador (o diferencial)
- 38 livros/PDFs em `livros/` destilados em 5 blocos: `intelligence/knowledge/01..05`
  (ondas/previsão, geomorfologia, segurança, etiqueta/técnica, língua/gíria).
- `data/beaches.json`: **87 praias** com perfil (fundo, orientação, janela de swell,
  terral, maré, caráter). Fonte única do narrador e do painel.
- `scripts/generate-narrator.js` reescrito: lê beaches.json, injeta o conhecimento no
  prompt (com caching), classifica vento pela orientação real, **cache por condição**
  (paga cada texto 1x → custo despenca), structured output (fim dos erros de JSON),
  2 variações por condição, rotação por data.
- Regras de voz (`intelligence/voice-rules.md`): nunca desincentivar o surf; escrever
  pra quem NÃO sabe ler previsão (traduzir jargão inline, sensação antes de número).

### Site 100% estático (sem servidor pago)
- Ranking WSL (masc+fem) do **ge.globo** via IA → `scripts/generate-ranking.js`.
- Feed de notícias filtrado via IA → `scripts/generate-feed.js`.
- App lê ranking/feed/produtos de JSON estático (fim da dependência Netlify/Pipedream).
- Workflows: `narrator.yml` (6h), `ranking.yml` (por etapa/semana), `feed.yml` (48h),
  `deploy-pages.yml` (publica a pasta `demo/`). Serializados por grupo de concorrência.

### Landing page (demo/index.html — a publicada)
- Preços reais: R$19,90/mês, R$149/ano, fundador R$99 (primeiros 300).
- Trial de 7 dias sem cartão. 85+ praias.
- Avaliações humanas (José Luiz Branco, Vitor Oliveira, Pedro Henrique).

### Painel de controle (demo/admin.html)
- Senha atual (provisória): **`tideline2026`**.
- Abas: Loja (CRUD de produtos, com imagem), Cupons, Praias (carrega/edita/exporta
  beaches.json), Templates (preview REAL dos cards), Assinantes (placeholder fase 2).
- Loja já modifica o app (via `demo/products.json`).

### Modo ao vivo (Supabase) — construído, defensivo, falta ativar
- `demo/tideline-config.js` (credenciais, vazio por padrão = modo estático atual).
- `demo/tideline-data.js` (camada de dados: Supabase se configurado, senão JSON).
- Quando ativar: editar no painel → app atualiza NA HORA, sem deploy. Ver `SUPABASE.md`.

### Templates de "Minha Temporada" (compartilhamento)
- `demo/tideline-templates.js`: fonte única, usada pelo app e pelo painel.
- **3 free** (grade clássica: Noite no Mar, Espuma, Profundidade — com foto).
- **4 premium** (Manchete, Bilhete, Onda, Sol Retrô — logotipo real "tideline.").
- Métricas: SESSÕES / PRAIA FAVORITA / MAIOR MAR / CONQUISTA (sem streak/km).

### Marca / design
- `brand/tideline-illustration-style.md`: sistema de ilustração (cartum surf anos 70,
  Rick Griffin/comix; 2 variantes; mascote surfista veterano — NÃO caveira).
- `business/monetizacao.md` e `business/painel-controle.md`: estratégia e specs.

---

## 📋 PRÓXIMOS PASSOS (em ordem)

### Fase 1 — Colocar no ar (grátis, hoje/amanhã)
1. [ ] Resolver o login e `git push origin main` (ver bloqueio acima).
2. [ ] Conferir/criar o Secret `ANTHROPIC_API_KEY` no GitHub.
3. [ ] Rodar em Actions: **Gerar Narrações**, **Atualizar Ranking WSL**, **Atualizar Feed**.
4. [ ] Ativar Cloudflare Pages (Connect to Git → repo privado → Build output = `demo`).
5. [ ] Conferir o site no ar. (Opcional: domínio próprio em Pages → Custom domain.)

### Fase 2 — Login + painel ao vivo + premium
6. [ ] Criar projeto Supabase, rodar o schema, criar usuário admin (ver `SUPABASE.md`).
7. [ ] Colar as chaves em `demo/tideline-config.js`, commit (único deploy).
8. [ ] No painel: "☁ Publicar no Supabase" (envia os produtos).
9. [ ] Migrar sessões/temporada do usuário pra Supabase (dados seguros, multi-dispositivo).
10. [ ] Pagamento: Mercado Pago (Pix/cartão) ou Stripe — cobrança pelo site, nunca in-app.
11. [ ] Ligar o paywall: gate nos templates premium e nos dias 4-7 da previsão.

### Fase 3 — Crescimento (ideias com fosso vs Surfguru)
12. [ ] Botão "por quê?" em cada análise (vira escola, usa os livros) — retenção.
13. [ ] Ritual matinal (alerta no app no horário escolhido) — hábito.
14. [ ] "O que rolou" pós-sessão (compara previsão × realidade) — prova o valor.
15. [ ] Alertas por WhatsApp (Cloud API, opt-in, template aprovado) — PREMIUM, fase futura.
16. [ ] Virar app de loja: PWA primeiro, depois Capacitor (Play US$25 / Apple US$99/ano).

---

## ⚠️ COISAS A LEMBRAR (decisões e pegadinhas)

- **Sem WhatsApp no lançamento** — só alertas no app. WhatsApp é fase premium (setup Meta).
- **Banco de dados sobra** — sessão ≈ 250 bytes; Supabase free (500 MB) segura 10 mil+ usuários.
- **Imagens da Amazon = manual** (SiteStripe ou PA-API). O painel tem campo pra colar a URL.
- **Duas listas de praias** (a do app em `demo/app.html` E `data/beaches.json`) — hoje
  sincronizadas na mão (88 no app). Unificar na fase 2 (app lendo beaches.json).
- **Selos do card**: `calcConquista` usa rótulos (Ferrenho/Consistente) que NÃO batem com
  os selos reais da aba Eu (Na Fissura, Veterano, PRO...). Alinhar quando puder.
- **Modelo do narrador = Haiku** (barato). Dá pra trocar por um melhor se quiser mais qualidade.
- **Lemoore** (piscina de ondas) está na lista do app mas sem dados de mar — cai no fallback.

---

## 🧪 COMO TESTAR LOCALMENTE

- **Ver o app/landing/painel:** abrir `demo/index.html`, `demo/app.html`, `demo/admin.html`
  no Chrome. Senha do painel: `tideline2026`.
- **Servir com servidor** (pra fetch funcionar): `cd demo && python3 -m http.server 8000`.
- **Renderizar os templates (headless):** o Chrome headless tira screenshot de um harness
  de canvas (usado durante o desenvolvimento; ver histórico da conversa).
- **Testar os geradores** precisa da `ANTHROPIC_API_KEY` no ambiente (não roda sem chave).

---

## 🗂️ MAPA DOS ARQUIVOS IMPORTANTES

| Arquivo | O que é |
|---|---|
| `demo/index.html` | Landing publicada (preços, avaliações) |
| `demo/app.html` | O app (previsão, narrador, ranking, feed, diário, loja, temporada) |
| `demo/admin.html` | Painel de controle (senha tideline2026) |
| `demo/login.html` | Tela de entrada |
| `demo/tideline-templates.js` | Os 7 templates de temporada (app + painel usam) |
| `demo/tideline-config.js` | Credenciais Supabase (vazio = modo estático) |
| `demo/tideline-data.js` | Camada de dados Supabase-ou-JSON |
| `demo/products.json` | Produtos da loja (editável pelo painel) |
| `demo/narrator-cache.json` | Narrações geradas (o app lê) |
| `data/beaches.json` | 87 praias com perfil |
| `scripts/generate-narrator.js` | Gera as narrações (cache por condição) |
| `scripts/generate-ranking.js` | Ranking WSL do ge.globo |
| `scripts/generate-feed.js` | Feed de notícias filtrado |
| `intelligence/knowledge/*.md` | Conhecimento destilado dos livros |
| `intelligence/voice-rules.md` | Regras de voz do narrador |
| `business/monetizacao.md` | Preços, freemium, projeção |
| `business/painel-controle.md` | Specs do painel |
| `brand/tideline-illustration-style.md` | Sistema de ilustração da marca |
| `DEPLOY.md` | Passo a passo do go-live |
| `SUPABASE.md` | Passo a passo do modo ao vivo |
| `PROXIMOS-PASSOS.md` | **Este arquivo** |
