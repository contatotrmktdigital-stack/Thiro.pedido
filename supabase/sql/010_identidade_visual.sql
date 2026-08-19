-- ============================================================
-- Thiro.pedido — Identidade visual por restaurante
--
-- Permite que cada restaurante tenha sua própria logo, cor
-- principal e imagem de fundo, personalizando a aparência do
-- app sem mexer em código. Todos os campos são opcionais: se
-- não forem preenchidos, o app continua com a aparência padrão
-- da Thiro (nada muda para quem não personalizar).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants
  add column if not exists logo_url text,
  add column if not exists cor_primaria text,
  add column if not exists background_url text;

comment on column public.restaurants.logo_url is 'URL pública da logo do restaurante (bucket restaurant-assets). Se vazio, usa o ícone padrão da Thiro.';
comment on column public.restaurants.cor_primaria is 'Cor principal do restaurante em hexadecimal (ex: #1d4ed8). Se vazio, usa o azul padrão da Thiro.';
comment on column public.restaurants.background_url is 'URL pública da imagem de fundo do restaurante (bucket restaurant-assets). Se vazio, usa o fundo padrão.';

-- ------------------------------------------------------------
-- Bucket de armazenamento para logos e imagens de fundo
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict (id) do nothing;

-- leitura pública (são só imagens de marca do restaurante, não é dado sensível)
drop policy if exists "restaurant_assets_public_read" on storage.objects;
create policy "restaurant_assets_public_read"
  on storage.objects for select
  using ( bucket_id = 'restaurant-assets' );

-- só a gestão do próprio restaurante (pasta = restaurant_id) ou o super_admin pode enviar
drop policy if exists "restaurant_assets_write_own" on storage.objects;
create policy "restaurant_assets_write_own"
  on storage.objects for insert
  with check (
    bucket_id = 'restaurant-assets'
    and (
      public.is_super_admin()
      or (
        public.my_role() = 'gestao'
        and (storage.foldername(name))[1] = public.my_restaurant_id()::text
      )
    )
  );

-- e só ele (ou o super_admin) pode trocar/apagar o que já foi enviado
drop policy if exists "restaurant_assets_update_own" on storage.objects;
create policy "restaurant_assets_update_own"
  on storage.objects for update
  using (
    bucket_id = 'restaurant-assets'
    and (
      public.is_super_admin()
      or (
        public.my_role() = 'gestao'
        and (storage.foldername(name))[1] = public.my_restaurant_id()::text
      )
    )
  );

drop policy if exists "restaurant_assets_delete_own" on storage.objects;
create policy "restaurant_assets_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'restaurant-assets'
    and (
      public.is_super_admin()
      or (
        public.my_role() = 'gestao'
        and (storage.foldername(name))[1] = public.my_restaurant_id()::text
      )
    )
  );
