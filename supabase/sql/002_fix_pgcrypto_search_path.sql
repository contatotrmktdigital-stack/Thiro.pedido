-- ============================================================
-- Thiro.pedido — correção: gen_salt()/crypt() (pgcrypto) ficam no
-- schema "extensions" no Supabase, não em "public". As funções de
-- PIN precisam desse schema no search_path pra encontrá-las.
-- ============================================================

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
