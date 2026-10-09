-- ============================================================
-- Thiro.pedido — Apagar o restaurante "Dil's Burguer" de vez
--
-- Apaga os logins da equipe (auth.users) e o restaurante; todo o
-- resto (cardápio, comandas, itens, estoque, perfis) some em
-- cascata. Não mexe em nenhum outro restaurante nem no login de
-- super admin.
--
-- Não apaga as imagens (logo) do Storage — o Supabase não deixa
-- apagar arquivos por SQL; faça em Storage > restaurant-assets.
--
-- IRREVERSÍVEL. Como usar: cole no Supabase Dashboard > SQL Editor
-- > New query e clique em "Run".
-- ============================================================

do $$
declare
  v_restaurant_id uuid;
begin
  select id into v_restaurant_id
  from public.restaurants
  where name ilike '%Dil%Burg%'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurante "Dil''s Burguer" não encontrado.';
  end if;

  delete from auth.users
  where id in (select id from public.profiles where restaurant_id = v_restaurant_id);

  delete from public.restaurants where id = v_restaurant_id;
end $$;

-- Confirmação: restaurante deve mostrar 0.
select
  (select count(*) from public.restaurants where name ilike '%Dil%Burg%') as restaurante,
  (select count(*) from public.restaurants) as restaurantes_restantes,
  (select count(*) from public.profiles where role = 'super_admin') as super_admins;
