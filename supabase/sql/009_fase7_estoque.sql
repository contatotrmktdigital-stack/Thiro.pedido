-- ============================================================
-- Thiro.pedido — Fase 7: Estoque de insumos
--
-- Cada insumo (ingrediente) tem uma quantidade em estoque. Cada
-- produto do cardápio tem uma "receita" (quais insumos usa e
-- quanto de cada um). Quando o garçom lança um item na comanda, um
-- gatilho (trigger) no banco baixa automaticamente o estoque dos
-- insumos daquele produto — e devolve se o item for reduzido ou
-- removido antes de a comanda fechar (já que a edição só é possível
-- enquanto o item está "pendente", ver Fase 5).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

-- ------------------------------------------------------------
-- 1) Insumos (ingredientes) e seu estoque atual
-- ------------------------------------------------------------
create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  nome text not null,
  unidade text not null default 'un',
  quantidade_estoque numeric(10,3) not null default 0,
  estoque_minimo numeric(10,3),
  created_at timestamptz not null default now()
);

comment on table public.insumos is 'Ingredientes/insumos do restaurante e sua quantidade atual em estoque.';
comment on column public.insumos.unidade is 'Unidade de medida livre (ex: un, kg, g, L, ml).';
comment on column public.insumos.estoque_minimo is 'Quantidade mínima desejada — abaixo disso, a tela de estoque avisa.';

-- ------------------------------------------------------------
-- 2) Receita: quais insumos (e quanto de cada) um produto usa
-- ------------------------------------------------------------
create table if not exists public.produto_insumos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  quantidade numeric(10,3) not null check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique (produto_id, insumo_id)
);

comment on table public.produto_insumos is 'Receita de cada produto: quanto de cada insumo é consumido por unidade vendida.';

-- ------------------------------------------------------------
-- 3) Segurança (RLS) — mesmo padrão das fases anteriores
-- ------------------------------------------------------------
alter table public.insumos enable row level security;
alter table public.produto_insumos enable row level security;

drop policy if exists "insumos_select" on public.insumos;
create policy "insumos_select" on public.insumos
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "insumos_insert" on public.insumos;
create policy "insumos_insert" on public.insumos
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "insumos_update" on public.insumos;
create policy "insumos_update" on public.insumos
  for update
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "insumos_delete" on public.insumos;
create policy "insumos_delete" on public.insumos
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "produto_insumos_select" on public.produto_insumos;
create policy "produto_insumos_select" on public.produto_insumos
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "produto_insumos_insert" on public.produto_insumos;
create policy "produto_insumos_insert" on public.produto_insumos
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "produto_insumos_delete" on public.produto_insumos;
create policy "produto_insumos_delete" on public.produto_insumos
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

-- ------------------------------------------------------------
-- 4) Baixa automática de estoque (gatilho)
--    "security definer" pra poder atualizar o estoque mesmo quando
--    quem lançou o item foi um garçom (que não tem permissão direta
--    de editar a tabela "insumos").
-- ------------------------------------------------------------
-- Trata um item "cancelado" como quantidade efetiva zero pra efeito de
-- estoque — assim cancelar um item (em qualquer estágio) devolve os
-- insumos, do mesmo jeito que reduzir a quantidade ou excluir o item.
create or replace function public.aplicar_baixa_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta_quantidade numeric;
  produto_afetado uuid;
  qtd_antes numeric;
  qtd_depois numeric;
begin
  if TG_OP = 'INSERT' then
    qtd_antes := 0;
    qtd_depois := case when new.status = 'cancelado' then 0 else new.quantidade end;
    produto_afetado := new.produto_id;
  elsif TG_OP = 'UPDATE' then
    qtd_antes := case when old.status = 'cancelado' then 0 else old.quantidade end;
    qtd_depois := case when new.status = 'cancelado' then 0 else new.quantidade end;
    produto_afetado := new.produto_id;
  elsif TG_OP = 'DELETE' then
    qtd_antes := case when old.status = 'cancelado' then 0 else old.quantidade end;
    qtd_depois := 0;
    produto_afetado := old.produto_id;
  end if;

  delta_quantidade := qtd_depois - qtd_antes;

  if produto_afetado is not null and delta_quantidade <> 0 then
    update public.insumos i
    set quantidade_estoque = i.quantidade_estoque - (pi.quantidade * delta_quantidade)
    from public.produto_insumos pi
    where pi.insumo_id = i.id
      and pi.produto_id = produto_afetado;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists comanda_itens_baixa_estoque on public.comanda_itens;
create trigger comanda_itens_baixa_estoque
after insert or update of quantidade, status or delete on public.comanda_itens
for each row execute function public.aplicar_baixa_estoque();
