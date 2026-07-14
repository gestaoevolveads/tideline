-- Loja: pedidos e cupons.
--
-- Por que a tabela de pedidos existe:
--   Antes dela, o pedido só vivia dentro da metadata do Mercado Pago. Se a chamada pra
--   Montink falhasse (fora do ar, token vencido, produto removido), o cliente tinha pagado,
--   a camisa nunca seria produzida, e NÃO HAVERIA REGISTRO DE NADA. Ninguém saberia.
--   Agora todo pedido pago nasce aqui, com o que a Montink respondeu, e o painel mostra.

create table if not exists pedidos (
  id            bigserial primary key,
  ref           text unique not null,          -- TL-1731... (external_reference do MP)
  mp_id         text,                          -- id do pagamento no Mercado Pago
  criado_em     timestamptz not null default now(),

  cliente_nome  text,
  cliente_email text,
  cliente_fone  text,
  cliente_doc   text,

  produto_id    text,
  produto_nome  text,
  cor           text,
  tamanho       text,

  preco         numeric(10,2),
  frete         numeric(10,2),
  desconto      numeric(10,2) default 0,
  cupom         text,
  total         numeric(10,2),

  endereco      jsonb,

  -- o que aconteceu na Montink. 'pendente' = pago mas ainda não mandado.
  -- 'erro' = pago e a Montink recusou. Essa linha é a que evita o pedido fantasma.
  montink_status  text not null default 'pendente',   -- pendente | ok | erro
  montink_pedido  text,                               -- id do pedido lá
  montink_resposta jsonb
);

create index if not exists pedidos_criado_idx on pedidos (criado_em desc);
create index if not exists pedidos_status_idx on pedidos (montink_status);

-- Cupons. Sem tabela, cupom vira gambiarra no código e ninguém sabe quanto custou.
create table if not exists cupons (
  codigo      text primary key,                -- sempre em MAIÚSCULA
  desconto    numeric(10,2) not null,          -- porcentagem OU reais, ver 'tipo'
  tipo        text not null default 'pct',     -- pct | reais
  ativo       boolean not null default true,
  validade    date,                            -- null = não vence
  limite_usos int,                             -- null = ilimitado
  usos        int not null default 0,
  criado_em   timestamptz not null default now()
);

alter table pedidos enable row level security;
alter table cupons  enable row level security;

-- Quem escreve aqui é sempre o servidor, com a service role (que passa por cima da RLS).
-- O navegador só LÊ, e só se for o admin. Cupom lido por qualquer um seria cupom copiado e
-- espalhado no grupo do zap antes do fim do dia.
drop policy if exists "admin le pedidos" on pedidos;
drop policy if exists "admin le cupons"  on cupons;
drop policy if exists "admin mexe cupons" on cupons;

create policy "admin le pedidos" on pedidos
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

create policy "admin le cupons" on cupons
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

create policy "admin mexe cupons" on cupons
  for all to authenticated
  using (auth.jwt() ->> 'email' = 'hcmsffc@gmail.com')
  with check (auth.jwt() ->> 'email' = 'hcmsffc@gmail.com');

-- Um exemplo, pra você editar ou apagar:
-- insert into cupons (codigo, desconto, tipo, limite_usos) values ('FUNDADOR', 10, 'pct', 50);
