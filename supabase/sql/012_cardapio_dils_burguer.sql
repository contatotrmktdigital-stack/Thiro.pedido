-- ============================================================
-- Thiro.pedido — Cardápio do "Dil's Burguer"
--
-- Cadastra as categorias e todos os itens do cardápio enviado pelo
-- usuário (imagem). Busca o restaurante pelo nome, então não precisa
-- editar nada antes de rodar — só funciona se já existir um
-- restaurante com "Dil" e "Burg" no nome (ex: "Dil's Burguer").
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

do $$
declare
  v_restaurant_id uuid;
  v_cat_hamburgueres uuid;
  v_cat_adicionais uuid;
  v_cat_taxas uuid;
  v_cat_porcoes uuid;
  v_cat_sobremesas uuid;
  v_cat_bebidas uuid;
  v_cat_drinks uuid;
  v_cat_doses uuid;
begin
  select id into v_restaurant_id
  from public.restaurants
  where name ilike '%Dil%Burg%'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurante "Dil''s Burguer" não encontrado. Confira o nome cadastrado em Restaurantes.';
  end if;

  -- ------------------------------------------------------------
  -- Categorias
  -- ------------------------------------------------------------
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Hambúrgueres') returning id into v_cat_hamburgueres;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Adicionais') returning id into v_cat_adicionais;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Taxas e opções') returning id into v_cat_taxas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Porções') returning id into v_cat_porcoes;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Sobremesas e Limonadas') returning id into v_cat_sobremesas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Bebidas') returning id into v_cat_bebidas;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Drinks') returning id into v_cat_drinks;
  insert into public.categorias (restaurant_id, nome) values (v_restaurant_id, 'Doses') returning id into v_cat_doses;

  -- ------------------------------------------------------------
  -- Hambúrgueres
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, descricao, preco) values
    (v_restaurant_id, v_cat_hamburgueres, 'DB Vegetariano', 'Pão brioche selado na manteiga e mel, cheddar, ovo, cebola, catupiry, alface, tomate, rúcula, picles e molho verde.', 30.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Bacon', 'Pão de hambúrguer artesanal, hambúrguer de carne selecionada com 130g, muçarela, bacon, alface, tomate, cebola caramelizada e molho especial.', 35.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Smash Salada', 'Pão brioche selado na manteiga e mel, dois smash burgers, cheddar, alface, tomate e molho especial.', 30.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Smash 1.0', 'Pão brioche selado na manteiga e mel, smash burger, cheddar e molho especial.', 20.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Smash 2.0', 'Pão brioche selado na manteiga e mel, dois smash burgers, cheddar e molho especial.', 25.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Smash 3.0', 'Pão brioche selado na manteiga e mel, três smash burgers, cheddar, bacon e molho especial.', 35.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Onion', 'Pão brioche selado na manteiga e mel, hambúrguer de carne selecionada, onion rings, cheddar, bacon, alface, tomate e molho especial da casa.', 34.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Chicken', 'Pão brioche selado na manteiga e mel, filé de frango empanado, cheddar, bacon, barbecue, alface, tomate e maionese da casa.', 34.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Viajando na Maionese', 'Pão brioche selado na manteiga e mel, dois hambúrgueres de carne, cheddar, ovos, bacon e muita maionese da casa.', 42.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB King', 'Pão brioche selado na manteiga e mel, blend especial da casa, cheddar de chapa, geleia de pimenta, alface, rúcula, tomate, picles, cebola caramelizada e maionese especial.', 40.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Gourmet Chef', 'Pão brioche selado na manteiga e mel, blend especial da casa, cheddar, alface, rúcula, tomate, cebola caramelizada, bacon, muçarela empanada, molho especial da casa e cebola roxa.', 49.00),
    (v_restaurant_id, v_cat_hamburgueres, 'DB Sensação', 'Pão brioche selado na manteiga e mel, hambúrguer defumado, cheddar, bacon, muçarela e cebola caramelizada.', 55.00);

  -- ------------------------------------------------------------
  -- Adicionais
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_adicionais, 'Ovo', 4.00),
    (v_restaurant_id, v_cat_adicionais, 'Salsicha', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Muçarela', 5.00),
    (v_restaurant_id, v_cat_adicionais, 'Bacon', 6.00),
    (v_restaurant_id, v_cat_adicionais, 'Alface', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Abacaxi', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Tomate', 2.50),
    (v_restaurant_id, v_cat_adicionais, 'Banana', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Rúcula', 3.50),
    (v_restaurant_id, v_cat_adicionais, 'Batata palha', 3.00),
    (v_restaurant_id, v_cat_adicionais, 'Cebola empanada', 6.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer 130g', 8.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer 200g', 15.00),
    (v_restaurant_id, v_cat_adicionais, 'Hambúrguer vegetariano adicional', 11.00);

  -- ------------------------------------------------------------
  -- Taxas e opções
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_taxas, 'Copo completo', 2.50),
    (v_restaurant_id, v_cat_taxas, 'Embalagem para viagem', 3.00),
    (v_restaurant_id, v_cat_taxas, 'Hambúrguer servido no prato', 2.00);

  -- ------------------------------------------------------------
  -- Porções (Fritas + Mini Pastéis)
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, descricao, preco) values
    (v_restaurant_id, v_cat_porcoes, 'Fritas pequena', '150 g', 15.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas média', '400 g', 25.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas grande', '1 kg', 45.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas com bacon e cheddar', '400 g', 40.00),
    (v_restaurant_id, v_cat_porcoes, 'Fritas com bacon e cheddar', '1 kg', 60.00),
    (v_restaurant_id, v_cat_porcoes, 'Porção de mini pastéis de queijo e carne', null, 25.00),
    (v_restaurant_id, v_cat_porcoes, 'Porção de onion rings', null, 25.00);

  -- ------------------------------------------------------------
  -- Sobremesas e Limonadas
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
    (v_restaurant_id, v_cat_bebidas, 'Coca-Cola 2 litros', null, 16.00),
    (v_restaurant_id, v_cat_bebidas, 'Refrigerante 2 litros', null, 14.00),
    (v_restaurant_id, v_cat_bebidas, 'Refil de refrigerante', 'Mais sabor pra acompanhar cada mordida.', 17.99);

  -- ------------------------------------------------------------
  -- Drinks (sem álcool + aditivados)
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, descricao, preco) values
    (v_restaurant_id, v_cat_drinks, 'Camaro (Maracujá)', null, 25.00),
    (v_restaurant_id, v_cat_drinks, 'Ferrari (Groselha)', null, 20.00),
    (v_restaurant_id, v_cat_drinks, 'Lamborghini (Tangerina)', null, 25.00),
    (v_restaurant_id, v_cat_drinks, 'Caipirinha', 'Feita com cachaça — escolha Velho Barreiro ou 51.', 20.00),
    (v_restaurant_id, v_cat_drinks, 'Caipiroska', 'Feita com vodka Smirnoff.', 25.00),
    (v_restaurant_id, v_cat_drinks, 'Camaro Aditivado', null, 32.00),
    (v_restaurant_id, v_cat_drinks, 'Ferrari Aditivado', null, 27.00),
    (v_restaurant_id, v_cat_drinks, 'Lamborghini Aditivado', null, 32.00);

  -- ------------------------------------------------------------
  -- Doses
  -- ------------------------------------------------------------
  insert into public.produtos (restaurant_id, categoria_id, nome, preco) values
    (v_restaurant_id, v_cat_doses, 'Vodka', 9.00),
    (v_restaurant_id, v_cat_doses, 'Cachaça 51', 3.00),
    (v_restaurant_id, v_cat_doses, 'Velho Barreiro', 9.00),
    (v_restaurant_id, v_cat_doses, 'Whisky', 20.00);

end $$;

-- Confirmação: deve mostrar 8 categorias e 65 produtos.
select
  (select count(*) from public.categorias c join public.restaurants r on r.id = c.restaurant_id where r.name ilike '%Dil%Burg%') as categorias,
  (select count(*) from public.produtos p join public.restaurants r on r.id = p.restaurant_id where r.name ilike '%Dil%Burg%') as produtos;
