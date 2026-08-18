-- ============================================================
-- Thiro.pedido — Fase 1: Fundação
-- Estrutura multi-restaurante, perfis de usuário e segunda senha
-- (PIN) da área de administração.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) Tabela de restaurantes (cada restaurante = um "tenant")
-- ------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  admin_pin_hash text,               -- segunda senha da área de administração (hash, nunca texto puro)
  created_at timestamptz not null default now()
);

comment on table public.restaurants is 'Cada linha é um restaurante cliente da plataforma Thiro.pedido.';
comment on column public.restaurants.admin_pin_hash is 'Hash da segunda senha (PIN) exigida para entrar na área de administração do restaurante.';

-- ------------------------------------------------------------
-- 2) Papéis de usuário
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('super_admin', 'gestao', 'caixa', 'cozinha', 'garcom');
  end if;
end $$;

-- ------------------------------------------------------------
-- 3) Tabela de perfis (um perfil por usuário de login do Supabase Auth)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint super_admin_sem_restaurante check (
    (role = 'super_admin' and restaurant_id is null) or
    (role <> 'super_admin' and restaurant_id is not null)
  )
);

comment on table public.profiles is 'Um perfil por pessoa que faz login: define papel (garçom, cozinha, caixa, gestão, super_admin) e a qual restaurante pertence.';

-- ------------------------------------------------------------
-- 4) Funções auxiliares (usadas nas regras de segurança abaixo)
--    "security definer" faz elas rodarem sem re-disparar as
--    regras de RLS, evitando loop infinito.
-- ------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_restaurant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and active
  );
$$;

-- ------------------------------------------------------------
-- 5) Ativar Row Level Security (RLS)
--    A partir daqui, ninguém acessa dado de outro restaurante,
--    mesmo tentando "por fora" do site.
-- ------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;

-- restaurants: super_admin vê todos; qualquer outro usuário só vê o próprio restaurante
drop policy if exists "restaurants_select" on public.restaurants;
create policy "restaurants_select" on public.restaurants
  for select
  using ( public.is_super_admin() or id = public.my_restaurant_id() );

drop policy if exists "restaurants_insert" on public.restaurants;
create policy "restaurants_insert" on public.restaurants
  for insert
  with check ( public.is_super_admin() );

drop policy if exists "restaurants_update" on public.restaurants;
create policy "restaurants_update" on public.restaurants
  for update
  using (
    public.is_super_admin()
    or (id = public.my_restaurant_id() and public.my_role() = 'gestao')
  );

-- profiles: cada um vê o próprio perfil; gestão vê os perfis do seu restaurante; super_admin vê todos
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao')
  );

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao')
  );

-- observação: a CRIAÇÃO de novos perfis (novos logins) não acontece
-- por INSERT direto do navegador — ela passa pela função de borda
-- "create-user" (ver supabase/functions/create-user), que usa a
-- chave de serviço com mais cuidado e também cria o login no Auth.

-- ------------------------------------------------------------
-- 6) Segunda senha (PIN) da área de administração
-- ------------------------------------------------------------
create or replace function public.set_admin_pin(p_restaurant_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not (
    public.is_super_admin()
    or (public.my_role() = 'gestao' and public.my_restaurant_id() = p_restaurant_id)
  ) then
    raise exception 'Sem permissão para definir a senha de administração deste restaurante.';
  end if;

  if length(p_pin) < 4 then
    raise exception 'A senha de administração precisa ter pelo menos 4 caracteres.';
  end if;

  update public.restaurants
  set admin_pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_restaurant_id;
end;
$$;

create or replace function public.verify_admin_pin(p_restaurant_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if not (
    public.is_super_admin() or public.my_restaurant_id() = p_restaurant_id
  ) then
    return false;
  end if;

  select admin_pin_hash into v_hash from public.restaurants where id = p_restaurant_id;

  if v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_pin, v_hash);
end;
$$;

grant execute on function public.set_admin_pin(uuid, text) to authenticated;
grant execute on function public.verify_admin_pin(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 7) Primeiro super admin (rode manualmente, uma vez só)
-- ------------------------------------------------------------
-- Passo a passo:
--   1. No Supabase Dashboard: Authentication > Users > Add user
--      Crie um usuário com seu e-mail e uma senha forte.
--      Marque "Auto Confirm User" para não precisar confirmar e-mail.
--   2. Copie o "User UID" gerado.
--   3. Rode o comando abaixo, trocando SEU-UUID-AQUI e SEU NOME:
--
-- insert into public.profiles (id, restaurant_id, full_name, role)
-- values ('SEU-UUID-AQUI', null, 'Seu Nome', 'super_admin');
