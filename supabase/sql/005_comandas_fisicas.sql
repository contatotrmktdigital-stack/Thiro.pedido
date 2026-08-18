-- ============================================================
-- Thiro.pedido — ajuste da Fase 3, em duas partes:
--
-- 1) Número da comanda física (a ficha/cartão numerado que o
--    garçom entrega ao cliente) — conjunto fixo cadastrado pela
--    gestão, reaproveitado quando a comanda é fechada.
--
-- 2) A mesa deixa de ser um cadastro fixo: o garçom digita o
--    número da mesa na hora de abrir a comanda (não escolhe de uma
--    lista). Por isso a tabela "mesas" sai e vira um número solto
--    (mesa_numero) dentro da própria comanda.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

-- ------------------------------------------------------------
-- 1) Pool de números de comanda física
-- ------------------------------------------------------------
create table if not exists public.comandas_fisicas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  numero int not null check (numero > 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id, numero)
);

comment on table public.comandas_fisicas is 'Números das fichas/cartões de comanda física do restaurante, entregues ao cliente. Reaproveitados quando a comanda anterior é fechada.';

alter table public.comandas_fisicas enable row level security;

drop policy if exists "comandas_fisicas_select" on public.comandas_fisicas;
create policy "comandas_fisicas_select" on public.comandas_fisicas
  for select
  using ( public.is_super_admin() or restaurant_id = public.my_restaurant_id() );

drop policy if exists "comandas_fisicas_insert" on public.comandas_fisicas;
create policy "comandas_fisicas_insert" on public.comandas_fisicas
  for insert
  with check ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

drop policy if exists "comandas_fisicas_delete" on public.comandas_fisicas;
create policy "comandas_fisicas_delete" on public.comandas_fisicas
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );

alter table public.comandas
  add column if not exists comanda_fisica_id uuid references public.comandas_fisicas(id) on delete set null;

comment on column public.comandas.comanda_fisica_id is 'Ficha numerada entregue ao cliente para este atendimento.';

create unique index if not exists comandas_comanda_fisica_aberta_unica
  on public.comandas (comanda_fisica_id)
  where status = 'aberta';

-- ------------------------------------------------------------
-- 2) Mesa vira um número digitado na comanda, não um cadastro fixo
-- ------------------------------------------------------------
alter table public.comandas add column if not exists mesa_numero int;

update public.comandas c
set mesa_numero = m.numero
from public.mesas m
where c.mesa_id = m.id and c.mesa_numero is null;

alter table public.comandas alter column mesa_numero set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comandas_mesa_numero_positiva'
  ) then
    alter table public.comandas
      add constraint comandas_mesa_numero_positiva check (mesa_numero > 0);
  end if;
end $$;

alter table public.comandas drop column if exists mesa_id;
drop table if exists public.mesas;

comment on column public.comandas.mesa_numero is 'Número da mesa digitado pelo garçom ao abrir a comanda (não é um cadastro fixo).';
