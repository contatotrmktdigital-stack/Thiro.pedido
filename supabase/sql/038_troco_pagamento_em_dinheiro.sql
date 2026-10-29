-- ============================================================
-- Thiro.pedido — Troco no pagamento em dinheiro
--
-- Quando a forma de pagamento é DINHEIRO, o garçom/caixa informa o
-- "Valor recebido" e o sistema calcula o troco. Guardamos os dois na
-- comanda para aparecer na notinha e nos relatórios.
--
-- É ADITIVO: só cria 2 colunas novas (vazias nas comandas antigas).
-- Nada existente é alterado ou apagado.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas
  add column if not exists valor_recebido numeric(10,2),
  add column if not exists troco numeric(10,2);

comment on column public.comandas.valor_recebido is 'Quando pago em dinheiro: valor entregue pelo cliente.';
comment on column public.comandas.troco is 'Quando pago em dinheiro: troco devolvido (valor_recebido - valor_total).';
