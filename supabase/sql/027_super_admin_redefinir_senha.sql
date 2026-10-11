-- ============================================================
-- Thiro.pedido — Super admin redefine a senha de login do restaurante
--
-- Não existe "esqueci minha senha" no sistema (o login é livre,
-- pode nem ser e-mail). Esta função deixa o super admin definir
-- uma senha nova pro login de gestão de um restaurante, direto
-- pelo painel — sem Edge Function. Só super admin consegue chamar.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

create or replace function public.admin_reset_restaurant_password(
  p_restaurant_id uuid,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_user_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Só um super admin pode redefinir senhas.';
  end if;

  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;

  -- o login principal do restaurante: a conta de gestão mais antiga
  select id into v_user_id
  from public.profiles
  where restaurant_id = p_restaurant_id and role = 'gestao'
  order by created_at
  limit 1;

  if v_user_id is null then
    raise exception 'Esse restaurante não tem um login de gestão.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  where id = v_user_id;

  return true;
end;
$$;

grant execute on function public.admin_reset_restaurant_password(uuid, text) to authenticated;
