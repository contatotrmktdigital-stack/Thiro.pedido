-- ============================================================
-- Thiro.pedido — Boas-vindas com o nome do cliente na página do QR
--
-- A função pública da comanda passa a devolver também o nome do
-- cliente (quando o garçom informou), para a tela do cliente poder
-- dizer "Olá, Maria". O resto da função fica igual à da 031
-- (cardápio digital liga/desliga).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

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

  select r.name, r.logo_url, r.cor_primaria, r.cardapio_url, r.cardapio_ativo, r.active
    into v_rest
  from public.restaurants r
  where r.id = v_fisica.restaurant_id;

  if not found or not v_rest.active then
    return null;
  end if;

  select c.id, c.mesa_numero, c.taxa_servico, c.created_at, c.cliente_nome
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
      'cardapio_ativo', coalesce(v_rest.cardapio_ativo, false),
      'cardapio_url', case when v_rest.cardapio_ativo then v_rest.cardapio_url else null end
    ),
    'comanda_fisica', v_fisica.numero,
    'comanda', case
      when v_comanda.id is null then null
      else jsonb_build_object(
        'mesa', v_comanda.mesa_numero,
        'taxa_servico', v_comanda.taxa_servico,
        'aberta_em', v_comanda.created_at,
        'cliente_nome', v_comanda.cliente_nome
      )
    end,
    'itens', v_itens
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;
