# Tideline — Ativar o modo "ao vivo" (painel → app sem deploy)

Hoje o app funciona lendo arquivos JSON (para mudar, exporta e commita).
Ativando o Supabase, o painel escreve num banco e o app lê do banco **na hora** —
você edita um produto e ele muda no app **sem deploy nenhum**.

É grátis (Supabase free tier: 50 mil usuários/mês, 500 MB de banco).
Setup leva ~10 minutos, **uma vez**.

---

## Passo 1 — Criar o projeto (2 min)
1. Entre em https://supabase.com e crie conta.
2. "New project", escolha um nome (ex: tideline), defina uma senha de banco, região São Paulo.
3. Espere ~1 min o projeto subir.

## Passo 2 — Criar as tabelas (2 min)
No projeto: menu **SQL Editor** → New query → cole o bloco abaixo → **Run**.

```sql
-- PRODUTOS DA LOJA
create table products (
  id text primary key,
  cat text, marca text, nome text, preco text, url text, img text,
  ativo boolean default true
);

-- CUPONS (premium, fase 2)
create table coupons (
  id text primary key default gen_random_uuid()::text,
  codigo text, parceiro text, desconto text, validade text,
  premium boolean default true
);

-- TEMPLATES DE COMPARTILHAMENTO
create table templates (
  id text primary key,
  nome text, formato text,
  ativo boolean default true, premium boolean default false
);

-- SEGURANÇA: qualquer um LÊ (o app precisa), só ADMIN LOGADO escreve
alter table products enable row level security;
alter table coupons enable row level security;
alter table templates enable row level security;

create policy "leitura publica" on products  for select using (true);
create policy "leitura publica" on coupons   for select using (true);
create policy "leitura publica" on templates for select using (true);

create policy "escrita admin" on products  for all to authenticated using (true) with check (true);
create policy "escrita admin" on coupons   for all to authenticated using (true) with check (true);
create policy "escrita admin" on templates for all to authenticated using (true) with check (true);
```

## Passo 3 — Criar o usuário admin (1 min)
Menu **Authentication** → **Users** → **Add user** → coloque seu email e uma senha.
Esse é o login do painel no modo ao vivo (só você e o sócio).

## Passo 4 — Conectar (2 min)
1. Menu **Settings → API**. Copie **Project URL** e a chave **anon public**.
2. Abra o arquivo `demo/tideline-config.js` e cole as duas:
   ```js
   window.TIDELINE_CONFIG = {
     SUPABASE_URL: 'https://xxxx.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGci...',
   };
   ```
3. Commit + push desse arquivo. **Esse é o único deploy** — a partir daqui, dados são ao vivo.

## Passo 5 — Publicar os dados atuais (1 min)
1. Abra o painel (`/admin.html`). Agora ele pede **email + senha** (o usuário do Passo 3).
2. Na aba **Loja**, clique em **☁ Publicar no Supabase**. Isso envia os 69 produtos pro banco.
3. Pronto. Daqui pra frente: editar/adicionar/excluir produto no painel muda o app **na hora**.

---

## Como fica depois de ativado
- **Editar produto no painel** → salva no Supabase → app mostra na hora (sem deploy). ✅
- **Login do painel** → email/senha do Supabase (seguro, não é mais a senha fixa).
- **App** → lê produtos do Supabase; se o Supabase cair, cai no `products.json` automaticamente.

## O que ainda é por arquivo (fase 2)
- **Praias**: o narrador (GitHub Action) lê `data/beaches.json` no CI. Para as praias
  também ficarem ao vivo, o gerador precisa passar a ler do Supabase — próximo passo.
- **Cupons e Templates**: as tabelas já existem; o app passa a consumi-las quando o
  premium e o compartilhamento entrarem.

## Segurança
- A chave `anon` é pública de propósito (pode ficar no código). Quem protege os dados
  é o RLS: leitura liberada, escrita só para quem loga como admin.
- Login do painel via Supabase Auth. Sem login válido, ninguém escreve.
