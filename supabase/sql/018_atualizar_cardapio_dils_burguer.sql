-- ============================================================
-- Thiro.pedido — Atualização do cardápio do "Dil's Burguer"
--
-- O cardápio novo tem categorias e nomes diferentes do anterior
-- (ex: os "Smash" viraram categoria própria, entraram "Kids/Mini"
-- e "Drinks & Doses"), então este script APAGA as categorias e
-- produtos atuais do Dil's Burguer e recadastra tudo do zero com
-- os preços e nomes mais recentes.
--
-- Pedidos já lançados (histórico/relatórios) não são afetados —
-- eles guardam o nome e o preço no momento da venda, não dependem
-- do produto continuar existindo.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

do $$
declare
  v_restaurant_id uuid;
  v_cat_hamburgueres uuid;
  v_cat_taxas uuid;
  v_cat_smashs uuid;
  v_cat_adicionais uuid;
  v_cat_porcoes uuid;
  v_cat_kids uuid;
  v_cat_sobremesas uuid;
  v_cat_bebidas uuid;
  v_cat_drinks_doses uuid;
begin
  select id into v_restaurant_id
  from public.restaurants
  where name ilike '%Dil%Burg%'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurante "Dil''s Burguer" não encontrado. Confira o nome cadastrado em Restaurantes.';
  end if;

  -- ------------------------------------------------------------
  -- Apaga o cardápio atual (cascata apaga os produtos junto)
  -- ------------------------------------------------------------
  delete from public.categorias where restaurant_id = v_restaurant_id;

  -- ------------------------------------------------------------
  -- Categorias
  -- ------------------------------------------------------------
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Hambúrgueres') returning id into v_cat_hamburgueres;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Taxas e opções') returning id into v_cat_taxas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Smashs') returning id into v_cat_smashs;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Adicionais') returning id into v_cat_adicionais;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Porções') returning id into v_cat_porcoes;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Kids / Mini') returning id into v_cat_kids;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Sobremesas') returning id into v_cat_sobremesas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Bebidas') returning id into v_cat_bebidas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Drinks & Doses') returning id into v_cat_drinks_doses;

  -- ------------------------------------------------------------
  -- Hambúrgueres
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_hamburgueres, 'DB Burger', 25.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Salada', 29.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Bacon', 36.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Onion Rings', 34.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Chicken', 34.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Viajando na Maionese', 42.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB King', 40.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Gourmet Chef', 49.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Sensação', 56.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Filé de Frango', 30.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Vegetariano', 30.00),
    (v_restaurant_id, v_cat_hamburgueres, 'Refil de Refrigerante', 17.99);

  -- ------------------------------------------------------------
  -- Taxas e opções
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_taxas, 'Copo completo', 2.50),
    (v_restaurant_id, v_cat_taxas, 'Embalagem para viagem', 2.00),
    (v_restaurant_id, v_cat_taxas, 'Hambúrguer servido no prato', 2.00);

  -- ------------------------------------------------------------
  -- Smashs
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_smashs, 'DB Smash Original', 22.00),
    (v_restaurant_id, v_cat_smashs, 'Dil''s Double Cheese', 32.60),
    (v_restaurant_id, v_cat_smashs, 'DB Bacon Smash', 34.00),
    (v_restaurant_id, v_cat_smashs, 'DB Oklahoma Onion', 25.00);

  -- ------------------------------------------------------------
  -- Adicionais
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_adicionais, 'Ovo', 4.00),
    (v_restaurant_id, v_cat_adicionais, 'Salsicha', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Muçarela', 6.00),
    (v_restaurant_id, v_cat_adicionais, 'Bacon', 8.00),
    (v_restaurant_id, v_cat_adicionais, 'Alface', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Abacaxi', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Tomate', 2.50),
    (v_restaurant_id, v_cat_adicionais, 'Banana', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Rúcula', 3.50),
    (v_restaurant_id, v_cat_adicionais, 'Batata palha', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Cebola empanada', 6.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer 130 g', 8.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer 200 g', 15.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer vegetariano adicional', 3.00);

  -- ------------------------------------------------------------
  -- Porções
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, descricao, preco) values
    (v_restaurant_id, v_cat_porcoes, 'Fritas da casa — Pequena', '150 g', 15.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas da casa — Média', '400 g', 25.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas da casa — Grande', '1 kg', 45.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas com bacon e cheddar', '400 g', 40.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas com bacon e cheddar', '1 kg', 60.00),
    (v_restaurant_id, v_cat_porcoes, 'Mini pastéis de queijo e carne', null, 20.00),
    (v_restaurant_id, v_cat_porcoes, 'Onion rings', null, 25.00);

  -- ------------------------------------------------------------
  -- Kids / Mini
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_kids, 'DB Burguinho', 8.90),
    (v_restaurant_id, v_cat_kids, 'DB Yasui', 13.00),
    (v_restaurant_id, v_cat_kids, 'DB Mini Chicken', 15.00),
    (v_restaurant_id, v_cat_kids, 'DB Saladinha', 11.90);

  -- ------------------------------------------------------------
  -- Sobremesas
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_sobremesas, 'Petit Gateau', 30.00),
    (v_restaurant_id, v_cat_sobremesas, 'Brownie com sorvete', 30.00),
    (v_restaurant_id, v_cat_sobremesas, 'Taça de sorvete', 17.00),
    (v_restaurant_id, v_cat_sobremesas, 'Limonada Suíça', 18.00),
    (v_restaurant_id, v_cat_sobremesas, 'Limonada Italiana', 14.00);

  -- ------------------------------------------------------------
  -- Bebidas
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, descricao, preco) values
    (v_restaurant_id, v_cat_bebidas, 'Refrigerante lata', null, 7.00),
    (v_restaurant_id, v_cat_bebidas, 'Água sem gás', null, 4.00),
    (v_restaurant_id, v_cat_bebidas, 'Água com gás', null, 6.00),
    (v_restaurant_id, v_cat_bebidas, 'Suco natural', '500 ml', 14.00),
    (v_restaurant_id, v_cat_bebidas, 'Suco de polpa', '500 ml', 12.00),
    (v_restaurant_id, v_cat_bebidas, 'Cerveja Original', null, 14.00),
    (v_restaurant_id, v_cat_bebidas, 'Heineken', null, 13.00),
    (v_restaurant_id, v_cat_bebidas, 'Cerveja lata', null, 7.00),
    (v_restaurant_id, v_cat_bebidas, 'Refrigerante 1 litro', null, 11.00),
    (v_restaurant_id, v_cat_bebidas, 'Refrigerante 2 litros', 'Exclusivo delivery', 15.00);

  -- ------------------------------------------------------------
  -- Drinks & Doses
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_drinks_doses, 'Camaro (Maracujá)', 25.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Ferrari (Groselha)', 30.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Lamborghini (Tangerina)', 25.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Caipirinha', 20.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Caipiroska', 25.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Camaro Aditivado', 32.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Ferrari Aditivado', 27.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Lamborghini Aditivado', 32.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Vodka (dose)', 5.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Cachaça 51 (dose)', 5.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Velho Barreiro (dose)', 5.00),
    (v_restaurant_id, v_cat_drinks_doses, 'Whisky (dose)', 20.00);

end $$;

-- Confirmação: deve mostrar 9 categorias e 71 produtos.
select
  (select count(*) from public.categorias c join public.restaurants r on r.id = c.restaurant_id where r.name ilike '%Dil%Burg%') as categorias,
  (select count(*) from public.produtos p join public.restaurants r on r.id = p.restaurant_id where r.name ilike '%Dil%Burg%') as produtos;
