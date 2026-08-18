-- ============================================================
-- Thiro.pedido — Fase 2: Cardápio
-- Categorias e produtos, isolados por restaurante (mesmo padrão de
-- segurança da Fase 1).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

-- ------------------------------------------------------------
-- 1) Categorias do cardápio (ex: Hambúrgueres, Bebidas...)
-- ------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

comment on table public.categorias is 'Categorias do cardápio de cada restaurante (ex: Hambúrgueres, Bebidas, Sobremesas).';

-- ------------------------------------------------------------
-- 2) Produtos do cardápio
-- ------------------------------------------------------------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.produtos is 'Itens do cardápio (hambúrgueres, bebidas etc.), cada um dentro de uma categoria e de um restaurante.';

-- ------------------------------------------------------------
-- 3) Segurança (RLS) — mesmo padrão da Fase 1: cada restaurante só
--    enxerga e edita o próprio cardápio; gestão edita, os outros
--    papéis (garçom/cozinha/caixa) só podem ler (vão precisar disso
--    nas próximas fases, pra montar comandas).
-- ------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;

drop policy if exists "categorias_select" on public.categorias;
create policy "categorias_select" on public.categorias
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "categorias_insert" on public.categorias;
create policy "categorias_insert" on public.categorias
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "categorias_update" on public.categorias;
create policy "categorias_update" on public.categorias
  for update
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "categorias_delete" on public.categorias;
create policy "categorias_delete" on public.categorias
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "produtos_select" on public.produtos;
create policy "produtos_select" on public.produtos
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "produtos_insert" on public.produtos;
create policy "produtos_insert" on public.produtos
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "produtos_update" on public.produtos;
create policy "produtos_update" on public.produtos
  for update
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "produtos_delete" on public.produtos;
create policy "produtos_delete" on public.produtos
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );
