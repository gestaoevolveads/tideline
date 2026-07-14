-- Loja: ajuste pra API nova do Mercado Pago (Orders).
--
-- O que muda e por quê:
--   Antes, o pedido inteiro viajava dentro da "metadata" do Mercado Pago, e o webhook lia
--   ele de lá. A API nova (Orders) não devolve essa metadata do mesmo jeito, e depender de
--   um campo de terceiro pra saber o que produzir sempre foi frágil.
--
--   Agora o pedido nasce AQUI, no nosso banco, antes de cobrar, com status 'aguardando'.
--   Quando o pagamento entra, o webhook acha a linha pela referência (TL-...) e manda pra
--   Montink. Se o Mercado Pago mudar de API de novo, isso continua funcionando.
--
-- Rode este arquivo DEPOIS do sql/loja.sql.

-- o pedido da Montink, guardado inteiro: é ele que o webhook manda quando o dinheiro entra
alter table pedidos add column if not exists payload jsonb;

-- 'aguardando' = cobrança criada, dinheiro ainda não entrou (Pix esperando, cartão em análise)
-- 'pendente'   = pago, ainda não mandado pra Montink
-- 'ok'         = pago e produzindo
-- 'erro'       = pago e a Montink recusou. É a única linha que exige você.
alter table pedidos alter column montink_status set default 'aguardando';

-- o id da ordem no Mercado Pago, pra conferir um pagamento quando precisar
alter table pedidos add column if not exists mp_order text;

-- Ninguém deveria ter dois pedidos com a mesma referência, e o índice único já garante isso
-- (ele veio do 'ref text unique' no sql/loja.sql).
