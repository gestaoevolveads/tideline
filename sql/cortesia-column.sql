-- Marca "cortesia" no perfil: premium dado na mão pelo admin (não pagante).
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- Serve pra o painel NÃO contar essas contas como premium pagante nem como receita.
-- O acesso premium delas continua igual (plano/premium_until); isto é só contabilidade.
-- (Contas com plano 'vitalicio' já são tratadas como cortesia mesmo sem esta coluna;
--  a coluna cobre também os premium manuais por X dias.)

alter table profiles add column if not exists cortesia boolean default false;
