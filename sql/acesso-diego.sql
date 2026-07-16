-- ACESSO DO DIEGO (sócio) AO PAINEL — rode no SQL Editor do Supabase. Idempotente.
--
-- O que este arquivo faz:
--   1. Deixa o login diego@tideline.app LER a lista de usuários, MAS o banco
--      nunca entrega pra ele: contas cortesia, contas vitalícias (testes e
--      convidados) e contas @beta. Se alguém virar cortesia amanhã, some da
--      vista dele sozinho, porque o filtro é por estado da conta, não por lista.
--   2. Dá a ele leitura nas tabelas que as outras abas do painel usam
--      (pedidos, cupons, afiliados etc.), pra o painel não quebrar.
--
-- O que ele NÃO ganha (de propósito):
--   - Escrita em nada (só leitura).
--   - A API de dar/tirar premium continua só com o Hudson (checada no servidor,
--     functions/api/admin-premium.js).
--
-- Antes de rodar: crie a conta dele no seu painel (cartão "Criar usuário de
-- teste"): email diego@tideline.app, senha 852456. A conta entra como
-- cortesia/vitalícia, então ela mesma fica invisível pra ele.

-- 1) profiles: leitura FILTRADA
drop policy if exists "diego_le_assinantes" on profiles;
create policy "diego_le_assinantes" on profiles for select
  using (
    auth.jwt() ->> 'email' = 'diego@tideline.app'
    and coalesce(cortesia, false) = false
    and coalesce(plano, '') <> 'vitalicio'
    and coalesce(email, '') not like '%@beta.tideline.com.br'
  );

-- 2) leitura nas tabelas das outras abas (cada uma protegida contra tabela
--    inexistente, pra este arquivo rodar inteiro em qualquer estado do banco)
do $$ begin
  execute 'drop policy if exists "diego_le" on pedidos';
  execute 'create policy "diego_le" on pedidos for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on cupons';
  execute 'create policy "diego_le" on cupons for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on afiliados';
  execute 'create policy "diego_le" on afiliados for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on comissoes';
  execute 'create policy "diego_le" on comissoes for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on config';
  execute 'create policy "diego_le" on config for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on ebooks';
  execute 'create policy "diego_le" on ebooks for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;

do $$ begin
  execute 'drop policy if exists "diego_le" on visits';
  execute 'create policy "diego_le" on visits for select using (auth.jwt() ->> ''email'' = ''diego@tideline.app'')';
exception when undefined_table then null; end $$;
