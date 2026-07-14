-- Deixa o admin (hcmsffc@gmail.com) LER todos os perfis no painel (aba Assinantes).
-- Rode no SQL Editor do Supabase. É idempotente: pode rodar de novo sem problema.
--
-- As ESCRITAS de premium (dar/remover/criar/excluir) NÃO precisam de policy:
-- passam pela chave de serviço no servidor (functions/api/admin-premium.js), que
-- roda por cima da RLS. Esta policy é só pra o admin ENXERGAR a lista de contas.

alter table profiles enable row level security;

drop policy if exists "admin le profiles" on profiles;
create policy "admin le profiles" on profiles
  for select
  using ( auth.jwt() ->> 'email' = 'hcmsffc@gmail.com' );
