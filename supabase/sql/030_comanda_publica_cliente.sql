-- ============================================================
-- Thiro.pedido — Comanda e cardápio para o CLIENTE (sem login)
--
-- O QR code da comanda física passa a servir também ao cliente:
-- quem escaneia sem estar logado vê o consumo da própria comanda
-- (só leitura) e o cardápio do restaurante.
--
-- Como é acesso SEM login, nada é liberado direto nas tabelas.
-- Duas funções "security definer" devolvem só o necessário,
-- partindo do id da comanda física (um UUID impossível de
-- adivinhar, que só existe no QR impresso):
--   - comanda_publica: nome/logo/cor do restaurante, link do
--     cardápio, e os itens da comanda ABERTA daquela ficha
--     (cancelados não aparecem). Fechou/pagou = volta vazio.
--   - cardapio_publico: categorias e produtos ativos.
--
-- Também adiciona restaurants.cardapio_url: o link do cardápio
-- digital do restaurante (configurado em Gestão).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants add column if not exists cardapio_url text;

comment on column public.restaurants.cardapio_url is 'Link do cardápio digital do restaurante, aberto pelo cliente ao escanear o QR da comanda.';

create or replace function public.comanda_publica(p_comanda_fisica_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fisica record;
  v_rest record;
  v_comanda record;
  v_itens jsonb := '[]'::jsonb;
begin
  select cf.id, cf.numero, cf.restaurant_id
    into v_fisica
  from public.comandas_fisicas cf
  where cf.id = p_comanda_fisica_id;

  if not found then
    return null;
  end if;

  select r.name, r.logo_url, r.cor_primaria, r.cardapio_url, r.active
    into v_rest
  from public.restaurants r
  where r.id = v_fisica.restaurant_id;

  if not found or not v_rest.active then
    return null;
  end if;

  select c.id, c.mesa_numero, c.taxa_servico, c.created_at
    into v_comanda
  from public.comandas c
  where c.comanda_fisica_id = v_fisica.id and c.status = 'aberta'
  order by c.created_at desc
  limit 1;

  if found then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'nome', i.nome_produto,
          'quantidade', i.quantidade,
          'preco', i.preco_unitario,
          'status', i.status,
          'observacao', i.observacao
        )
        order by i.created_at
      ),
      '[]'::jsonb
    )
      into v_itens
    from public.comanda_itens i
    where i.comanda_id = v_comanda.id and i.status <> 'cancelado';
  end if;

  return jsonb_build_object(
    'restaurante', jsonb_build_object(
      'nome', v_rest.name,
      'logo_url', v_rest.logo_url,
      'cor_primaria', v_rest.cor_primaria,
      'cardapio_url', v_rest.cardapio_url
    ),
    'comanda_fisica', v_fisica.numero,
    'comanda', case
      when v_comanda.id is null then null
      else jsonb_build_object(
        'mesa', v_comanda.mesa_numero,
        'taxa_servico', v_comanda.taxa_servico,
        'aberta_em', v_comanda.created_at
      )
    end,
    'itens', v_itens
  );
end;
$$;

create or replace function public.cardapio_publico(p_comanda_fisica_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_ativo boolean;
begin
  select cf.restaurant_id, r.active
    into v_restaurant_id, v_ativo
  from public.comandas_fisicas cf
  join public.restaurants r on r.id = cf.restaurant_id
  where cf.id = p_comanda_fisica_id;

  if not found or not v_ativo then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'categoria', c.nome,
          'produtos', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object('nome', p.nome, 'descricao', p.descricao, 'preco', p.preco)
                order by p.created_at
              ),
              '[]'::jsonb
            )
            from public.produtos p
            where p.categoria_id = c.id and p.ativo
          )
        )
        order by c.created_at
      )
      from public.categorias c
      where c.restaurant_id = v_restaurant_id
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
revoke all on function public.cardapio_publico(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;
grant execute on function public.cardapio_publico(uuid) to anon, authenticated;
