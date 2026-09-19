-- ============================================================
-- Thiro.pedido — Fechar comanda SEM contar nos relatórios
--
-- Nova coluna em "comandas": quando a gestão fecha uma comanda pela
-- aba "Comandas em aberto" (Administração), ela é marcada como
-- "fora dos relatórios" e some do faturamento, da caixinha e da
-- lista de fechadas do caixa. Os itens continuam registrados no
-- Histórico de pedidos (foram lançados de verdade).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas
  add column if not exists fora_dos_relatorios boolean not null default false;

comment on column public.comandas.fora_dos_relatorios is 'Comanda fechada pela gestão sem entrar nos relatórios/caixinha (ex: consumo da casa, teste, cortesia).';
