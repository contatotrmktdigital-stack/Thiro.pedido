-- ============================================================
-- Thiro.pedido — Fase 3: Mesas e comandas (fluxo do garçom)
-- Balcão e delivery ficam pra Fase 6 — aqui é só atendimento nas
-- mesas do salão.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

-- ------------------------------------------------------------
-- 1) Mesas do salão
-- ------------------------------------------------------------
create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  numero int not null check (numero > 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id, numero)
);

comment on table public.mesas is 'Mesas do salão de cada restaurante (atendimento presencial).';

-- ------------------------------------------------------------
-- 2) Comandas (uma comanda = uma mesa ocupada, do momento em que
--    é aberta até ser fechada pelo caixa — fechamento chega na
--    Fase 5)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'comanda_status') then
    create type public.comanda_status as enum ('aberta', 'fechada');
  end if;
end $$;

create table if not exists public.comandas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  status public.comanda_status not null default 'aberta',
  taxa_servico boolean not null default true,
  aberta_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  fechada_at timestamptz
);

comment on table public.comandas is 'Uma comanda aberta numa mesa. Fechamento/pagamento chega na Fase 5 (caixa).';

-- ------------------------------------------------------------
-- 3) Itens da comanda (nome e preço são "fotografados" no momento
--    do pedido, pra não mudar se o produto for editado depois)
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_status') then
    create type public.item_status as enum ('pendente', 'preparo', 'pronto', 'entregue', 'cancelado');
  end if;
end $$;

create table if not exists public.comanda_itens (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  preco_unitario numeric(10,2) not null,
  quantidade int not null check (quantidade > 0),
  observacao text,
  status public.item_status not null default 'pendente',
  created_at timestamptz not null default now()
);

comment on table public.comanda_itens is 'Itens pedidos dentro de uma comanda. nome_produto/preco_unitario são uma cópia do produto no momento do pedido.';

-- ------------------------------------------------------------
-- 4) Segurança (RLS) — mesmo padrão das fases anteriores.
--    Leitura liberada pra qualquer papel do restaurante (cozinha e
--    caixa vão precisar disso nas próximas fases). Escrita (abrir
--    comanda, lançar itens) é do garçom e da gestão.
-- ------------------------------------------------------------
alter table public.mesas enable row level security;
alter table public.comandas enable row level security;
alter table public.comanda_itens enable row level security;

drop policy if exists "mesas_select" on public.mesas;
create policy "mesas_select" on public.mesas
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "mesas_insert" on public.mesas;
create policy "mesas_insert" on public.mesas
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "mesas_delete" on public.mesas;
create policy "mesas_delete" on public.mesas
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "comandas_select" on public.comandas;
create policy "comandas_select" on public.comandas
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "comandas_insert" on public.comandas;
create policy "comandas_insert" on public.comandas
  for insert
  with check (
    public.my_role() in ('garcom', 'gestao') and restaurant_id = public.my_restaurant_id()
  );

drop policy if exists "comandas_update" on public.comandas;
create policy "comandas_update" on public.comandas
  for update
  using (
    public.my_role() in ('garcom', 'gestao') and restaurant_id = public.my_restaurant_id()
  );

drop policy if exists "comanda_itens_select" on public.comanda_itens;
create policy "comanda_itens_select" on public.comanda_itens
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "comanda_itens_insert" on public.comanda_itens;
create policy "comanda_itens_insert" on public.comanda_itens
  for insert
  with check (
    public.my_role() in ('garcom', 'gestao') and restaurant_id = public.my_restaurant_id()
  );

drop policy if exists "comanda_itens_update" on public.comanda_itens;
create policy "comanda_itens_update" on public.comanda_itens
  for update
  using (
    public.my_role() in ('garcom', 'gestao') and restaurant_id = public.my_restaurant_id()
  );

drop policy if exists "comanda_itens_delete" on public.comanda_itens;
create policy "comanda_itens_delete" on public.comanda_itens
  for delete
  using (
    public.my_role() in ('garcom', 'gestao') and restaurant_id = public.my_restaurant_id()
  );
