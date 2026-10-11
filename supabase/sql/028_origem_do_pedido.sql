-- ============================================================
-- Thiro.pedido — Registrar se o pedido foi feito pelo atendente
-- ou pela gestão
--
-- Com um único login por restaurante, não dá mais pra saber QUEM
-- lançou pelo usuário. Então registramos só a ÁREA de origem:
-- "atendente" (tela do garçom) ou "gestao" (lançado dentro da
-- área de Gestão, depois da senha). Vale pra comanda e pra cada
-- item. Tudo que já existe fica como "atendente".
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas
  add column if not exists origem text not null default 'atendente';

alter table public.comanda_itens
  add column if not exists origem text not null default 'atendente';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comandas_origem_valida') then
    alter table public.comandas
      add constraint comandas_origem_valida check (origem in ('atendente', 'gestao'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comanda_itens_origem_valida') then
    alter table public.comanda_itens
      add constraint comanda_itens_origem_valida check (origem in ('atendente', 'gestao'));
  end if;
end $$;

comment on column public.comandas.origem is 'Área onde a comanda foi aberta: atendente (tela do garçom) ou gestao.';
comment on column public.comanda_itens.origem is 'Área onde o item foi lançado: atendente (tela do garçom) ou gestao.';
