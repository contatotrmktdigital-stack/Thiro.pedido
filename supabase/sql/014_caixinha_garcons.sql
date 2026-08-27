-- ============================================================
-- Thiro.pedido — Separar a taxa de serviço (10%) do faturamento
--
-- Hoje o valor da taxa de serviço fica misturado dentro de
-- "valor_total" da comanda, e por isso entrava junto no faturamento
-- do restaurante nos Relatórios. Esse campo novo guarda só o valor
-- da taxa, calculado no momento em que a comanda é fechada, pra dar
-- pra separar "dinheiro do estabelecimento" de "dinheiro da equipe"
-- (a taxa de serviço é dos garçons, não da casa).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas
  add column if not exists valor_taxa_servico numeric(10,2) not null default 0;

comment on column public.comandas.valor_taxa_servico is 'Valor da taxa de serviço (10%) dessa comanda, calculado no fechamento. É dinheiro da equipe, não entra no faturamento do estabelecimento nos Relatórios.';
