-- ============================================================
-- Thiro.pedido — Limpar fila da cozinha do "Dil's Burguer"
--
-- Apaga só os itens ainda "pendente" ou "preparo" (os que aparecem
-- na tela da cozinha hoje, sobra de testes antigos). NÃO mexe em
-- itens "pronto"/"entregue"/"cancelado" — esses continuam valendo
-- pro Histórico de pedidos e pros relatórios de produtos vendidos.
-- Também não mexe nas comandas em si (abertas continuam abertas).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

delete from public.comanda_itens
where restaurant_id = (select id from public.restaurants where name ilike '%Dil%Burg%')
  and status in ('pendente', 'preparo');

-- Confirmação: deve mostrar 0.
select count(*) as itens_restantes_na_fila
from public.comanda_itens
where restaurant_id = (select id from public.restaurants where name ilike '%Dil%Burg%')
  and status in ('pendente', 'preparo');
