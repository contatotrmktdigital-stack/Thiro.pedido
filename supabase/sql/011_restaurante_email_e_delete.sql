-- ============================================================
-- Thiro.pedido — E-mail do restaurante + apagar restaurante de vez
--
-- 1) Guarda o e-mail do login de gestão no próprio restaurante,
--    pra aparecer na listagem do super admin.
--
-- 2) Função "delete_restaurant": permite ao super admin apagar um
--    restaurante de verdade (não só desativar). Diferente do
--    "delete" comum, ela também apaga os LOGINS (e-mail/senha) da
--    equipe desse restaurante, que não são apagados sozinhos só
--    por apagar a linha do restaurante — senão ficam "perdidos" no
--    sistema e o mesmo e-mail não pode ser reaproveitado depois.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants
  add column if not exists owner_email text;

comment on column public.restaurants.owner_email is 'E-mail do primeiro login de gestão, salvo na criação do restaurante — só pra exibição no painel do super admin.';

create or replace function public.delete_restaurant(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Só um super admin pode apagar um restaurante.';
  end if;

  delete from auth.users
  where id in (select id from public.profiles where restaurant_id = p_restaurant_id);

  delete from public.restaurants where id = p_restaurant_id;
end;
$$;

comment on function public.delete_restaurant(uuid) is 'Apaga um restaurante de vez: cardápio, comandas, estoque etc. somem em cascata, e essa função também apaga os logins da equipe (auth.users), que a cascata do banco não alcança. Só super_admin pode chamar.';

grant execute on function public.delete_restaurant(uuid) to authenticated;
