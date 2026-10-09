-- ============================================================
-- Thiro.pedido — Zerar os DADOS do "Dil's Burguer"
--
-- Apaga: comandas e itens (vendas/relatórios/histórico), comandas
-- físicas, cardápio (categorias e produtos) e estoque (insumos e
-- receitas).
--
-- NÃO apaga: o restaurante em si, os logins da equipe, a identidade
-- visual (logo/cor), a chave Pix e a senha de administração.
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

  delete from public.comanda_itens where restaurant_id = v_restaurant_id;
  delete from public.comandas where restaurant_id = v_restaurant_id;
  delete from public.comandas_fisicas where restaurant_id = v_restaurant_id;
  delete from public.produto_insumos where restaurant_id = v_restaurant_id;
  delete from public.insumos where restaurant_id = v_restaurant_id;
  delete from public.produtos where restaurant_id = v_restaurant_id;
  delete from public.categorias where restaurant_id = v_restaurant_id;
end $$;

-- Confirmação: tudo deve mostrar 0.
select
  (select count(*) from public.comandas c join public.restaurants r on r.id = c.restaurant_id where r.name ilike '%Dil%Burg%') as comandas,
  (select count(*) from public.comanda_itens i join public.restaurants r on r.id = i.restaurant_id where r.name ilike '%Dil%Burg%') as itens,
  (select count(*) from public.produtos p join public.restaurants r on r.id = p.restaurant_id where r.name ilike '%Dil%Burg%') as produtos,
  (select count(*) from public.categorias c join public.restaurants r on r.id = c.restaurant_id where r.name ilike '%Dil%Burg%') as categorias,
  (select count(*) from public.comandas_fisicas f join public.restaurants r on r.id = f.restaurant_id where r.name ilike '%Dil%Burg%') as comandas_fisicas,
  (select count(*) from public.insumos s join public.restaurants r on r.id = s.restaurant_id where r.name ilike '%Dil%Burg%') as insumos;
