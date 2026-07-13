-- Alerta Sniper: o que a pessoa monitora, onde ela recebe, e o que já foi avisado.
-- Rode inteiro no SQL Editor do Supabase. Pode rodar mais de uma vez.

-- ─────────────────────────────────────────────────────────────
-- 1) A configuração de cada pessoa
-- ─────────────────────────────────────────────────────────────
create table if not exists sniper_config (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  praias      text[] not null default '{}',        -- até 10, validado no app e no robô
  nota_minima int    not null default 2,           -- 2 = "condição boa" na escala do app
  ativo       boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table sniper_config enable row level security;

drop policy if exists "dono le sua config"    on sniper_config;
drop policy if exists "dono escreve sua config" on sniper_config;
drop policy if exists "dono atualiza sua config" on sniper_config;

create policy "dono le sua config" on sniper_config
  for select to authenticated using (auth.uid() = user_id);
create policy "dono escreve sua config" on sniper_config
  for insert to authenticated with check (auth.uid() = user_id);
create policy "dono atualiza sua config" on sniper_config
  for update to authenticated using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2) Os aparelhos que recebem push
--    Uma pessoa pode ter vários (celular, tablet, computador).
-- ─────────────────────────────────────────────────────────────
create table if not exists push_subs (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,                 -- o endereço que o navegador dá
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_user on push_subs(user_id);
alter table push_subs enable row level security;

drop policy if exists "dono le seus aparelhos"     on push_subs;
drop policy if exists "dono cadastra aparelho"     on push_subs;
drop policy if exists "dono descadastra aparelho"  on push_subs;

create policy "dono le seus aparelhos" on push_subs
  for select to authenticated using (auth.uid() = user_id);
create policy "dono cadastra aparelho" on push_subs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "dono descadastra aparelho" on push_subs
  for delete to authenticated using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3) Os alertas gerados
--    'evento' identifica o swell (praia|data). É o que impede o robô de avisar
--    duas vezes a mesma coisa. Quando a confiança sobe (radar -> confirmado),
--    a linha é ATUALIZADA e um novo push sai, porque agora é notícia nova.
-- ─────────────────────────────────────────────────────────────
create table if not exists sniper_alerts (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  evento     text not null,                        -- "Maresias|2026-07-22"
  praia      text not null,
  titulo     text not null,
  corpo      text not null,
  confianca  text not null,                        -- radar | provavel | confirmado
  score      int,
  dias       int,
  pico       timestamptz,
  altura     numeric,
  periodo    int,
  vento      text,
  horas      int,
  lido       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, evento)
);

create index if not exists sniper_alerts_user on sniper_alerts(user_id, created_at desc);
alter table sniper_alerts enable row level security;

drop policy if exists "dono le seus alertas"      on sniper_alerts;
drop policy if exists "dono marca como lido"      on sniper_alerts;

create policy "dono le seus alertas" on sniper_alerts
  for select to authenticated using (auth.uid() = user_id);
create policy "dono marca como lido" on sniper_alerts
  for update to authenticated using (auth.uid() = user_id);

-- Repare que ninguém tem policy de INSERT em sniper_alerts, e é de propósito:
-- quem escreve alerta é só o robô, usando a service role, que ignora RLS.
-- Assim ninguém consegue forjar um alerta pra si mesmo ou pros outros.

-- ─────────────────────────────────────────────────────────────
-- 4) Notícia por push (opt-in separado do alerta de swell)
--    Ficam na mesma tabela porque são a mesma decisão do usuário:
--    "quero ou não quero que o Tideline me chame no celular".
-- ─────────────────────────────────────────────────────────────
alter table sniper_config add column if not exists noticias boolean not null default false;

-- O que já foi avisado. Sem isso, toda rodada do feed reavisaria as mesmas notícias.
create table if not exists feed_sent (
  hash    text primary key,
  titulo  text,
  sent_at timestamptz not null default now()
);
alter table feed_sent enable row level security;
-- ninguém além do robô (service role) lê ou escreve aqui. Sem policy, sem acesso.
