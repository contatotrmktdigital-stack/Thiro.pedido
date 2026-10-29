-- ============================================================
-- Thiro.pedido — Dividir / transferir item entre comandas
--
-- Duas operações, sempre "tudo ou nada" (se algo falhar, nada muda):
--
--  1) dividir_item_unidades: move N unidades de um item para OUTRA
--     comanda (ex.: 2 das 3 cervejas). Mover o item inteiro vale em
--     qualquer situação (inclusive item ainda na cozinha); mover só
--     PARTE das unidades só vale para item já pronto/entregue.
--
--  2) dividir_item_igual: divide o valor de 1 unidade (já entregue)
--     igualmente entre várias comandas (a atual e/ou outras). Os
--     centavos que sobram vão para as primeiras partes, e a soma fecha
--     sempre no valor original.
--
-- Estoque: não muda (reduzir a quantidade devolve, a cópia tira de novo;
-- nas partes da divisão igual a cópia não tem produto, então não tira).
-- Fila da cozinha: as cópias entram já como "entregue", então não
-- aparecem na fila nem geram notificação.
-- Destino: só comanda de MESA, ABERTA, do mesmo restaurante.
--
-- Cada divisão fica registrada (com o nome do garçom) em
-- "comanda_item_divisoes".
--
-- É ADITIVO: coluna e tabela novas e duas funções. Nada existente é
-- alterado ou apagado.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comanda_itens
  add column if not exists divisao_de uuid;

comment on column public.comanda_itens.divisao_de is 'Quando o item é uma parte criada por "dividir igualmente": id do item original. Essas partes não contam como unidades extras nos relatórios.';

create table if not exists public.comanda_item_divisoes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  tipo text not null check (tipo in ('unidades', 'igual')),
  item_id uuid,
  nome_produto text not null,
  comanda_origem_id uuid references public.comandas(id) on delete set null,
  comanda_destino_id uuid references public.comandas(id) on delete set null,
  origem_rotulo text,
  destino_rotulo text,
  quantidade int not null default 1,
  valor numeric(10,2) not null,
  garcom_nome text,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.comanda_item_divisoes is 'Registro de cada item movido ou dividido entre comandas (quem, quando, de onde e para onde).';

create index if not exists comanda_item_divisoes_origem on public.comanda_item_divisoes (comanda_origem_id);
create index if not exists comanda_item_divisoes_destino on public.comanda_item_divisoes (comanda_destino_id);

alter table public.comanda_item_divisoes enable row level security;

drop policy if exists "comanda_item_divisoes_select" on public.comanda_item_divisoes;
create policy "comanda_item_divisoes_select" on public.comanda_item_divisoes
  for select
  using (public.is_super_admin() or restaurant_id = public.my_restaurant_id());

drop policy if exists "comanda_item_divisoes_insert" on public.comanda_item_divisoes;
create policy "comanda_item_divisoes_insert" on public.comanda_item_divisoes
  for insert
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() in ('garcom', 'gestao'));
-- (sem UPDATE/DELETE: o registro não pode ser alterado depois)

-- "Mesa 5 · Comanda 7" (texto para o registro)
create or replace function public.rotulo_comanda(p_comanda_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select 'Mesa ' || coalesce(c.mesa_numero::text, '?') || ' · Comanda ' || coalesce(cf.numero::text, '?')
  from public.comandas c
  left join public.comandas_fisicas cf on cf.id = c.comanda_fisica_id
  where c.id = p_comanda_id
$$;

-- confere se a comanda pode receber item (mesa, aberta, mesmo restaurante, diferente da origem)
create or replace function public.conferir_destino_divisao(p_origem_id uuid, p_destino_id uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  v_o record;
  v_d record;
begin
  select c.id, c.restaurant_id into v_o from public.comandas c where c.id = p_origem_id;
  select c.id, c.restaurant_id, c.status::text as status, c.tipo::text as tipo
    into v_d from public.comandas c where c.id = p_destino_id;
  if v_d.id is null then
    raise exception 'destino_nao_encontrado';
  end if;
  if v_d.id = v_o.id then
    raise exception 'mesma_comanda';
  end if;
  if v_d.restaurant_id <> v_o.restaurant_id then
    raise exception 'outro_restaurante';
  end if;
  if v_d.status <> 'aberta' then
    raise exception 'destino_fechado';
  end if;
  if v_d.tipo <> 'mesa' then
    raise exception 'destino_nao_e_mesa';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 1) Mover unidades para outra comanda
-- ------------------------------------------------------------
create or replace function public.dividir_item_unidades(
  p_item_id uuid,
  p_destino_id uuid,
  p_quantidade int,
  p_garcom_nome text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_item record;
  v_orig_status text;
begin
  select * into v_item from public.comanda_itens where id = p_item_id for update;
  if not found then
    raise exception 'item_nao_encontrado';
  end if;
  if v_item.status::text = 'cancelado' then
    raise exception 'item_cancelado';
  end if;

  select c.status::text into v_orig_status from public.comandas c where c.id = v_item.comanda_id;
  if v_orig_status is distinct from 'aberta' then
    raise exception 'comanda_origem_fechada';
  end if;

  perform public.conferir_destino_divisao(v_item.comanda_id, p_destino_id);

  if p_quantidade is null or p_quantidade < 1 or p_quantidade > v_item.quantidade then
    raise exception 'quantidade_invalida';
  end if;

  if p_quantidade = v_item.quantidade then
    -- item inteiro: só troca de comanda (vale em qualquer situação)
    update public.comanda_itens set comanda_id = p_destino_id where id = p_item_id;
  else
    -- só parte das unidades: o item já tem que estar feito
    if v_item.status::text not in ('pronto', 'entregue') then
      raise exception 'item_na_cozinha';
    end if;
    update public.comanda_itens set quantidade = quantidade - p_quantidade where id = p_item_id;
    insert into public.comanda_itens (
      restaurant_id, comanda_id, produto_id, nome_produto, preco_unitario, quantidade,
      observacao, status, setor, origem
    )
    values (
      v_item.restaurant_id, p_destino_id, v_item.produto_id, v_item.nome_produto, v_item.preco_unitario,
      p_quantidade, v_item.observacao, 'entregue', v_item.setor, v_item.origem
    );
  end if;

  insert into public.comanda_item_divisoes (
    restaurant_id, tipo, item_id, nome_produto, comanda_origem_id, comanda_destino_id,
    origem_rotulo, destino_rotulo, quantidade, valor, garcom_nome
  )
  values (
    v_item.restaurant_id, 'unidades', v_item.id, v_item.nome_produto, v_item.comanda_id, p_destino_id,
    public.rotulo_comanda(v_item.comanda_id), public.rotulo_comanda(p_destino_id),
    p_quantidade, round(v_item.preco_unitario * p_quantidade, 2),
    nullif(trim(coalesce(p_garcom_nome, '')), '')
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ------------------------------------------------------------
-- 2) Dividir 1 unidade igualmente entre várias comandas
-- ------------------------------------------------------------
create or replace function public.dividir_item_igual(
  p_item_id uuid,
  p_destinos uuid[],
  p_inclui_origem boolean,
  p_garcom_nome text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_item record;
  v_orig_status text;
  v_destino uuid;
  v_n int;
  v_total int;
  v_base int;
  v_resto int;
  v_i int := 0;
  v_share int;
  v_garcom text := nullif(trim(coalesce(p_garcom_nome, '')), '');
begin
  select * into v_item from public.comanda_itens where id = p_item_id for update;
  if not found then
    raise exception 'item_nao_encontrado';
  end if;
  if v_item.status::text = 'cancelado' then
    raise exception 'item_cancelado';
  end if;
  if v_item.quantidade <> 1 then
    raise exception 'so_uma_unidade';
  end if;
  if v_item.status::text not in ('pronto', 'entregue') then
    raise exception 'item_na_cozinha';
  end if;

  select c.status::text into v_orig_status from public.comandas c where c.id = v_item.comanda_id;
  if v_orig_status is distinct from 'aberta' then
    raise exception 'comanda_origem_fechada';
  end if;

  if p_destinos is null or cardinality(p_destinos) = 0 then
    raise exception 'sem_destino';
  end if;
  if (select count(distinct d) from unnest(p_destinos) d) <> cardinality(p_destinos) then
    raise exception 'destino_repetido';
  end if;
  foreach v_destino in array p_destinos loop
    perform public.conferir_destino_divisao(v_item.comanda_id, v_destino);
  end loop;

  v_n := cardinality(p_destinos) + case when coalesce(p_inclui_origem, false) then 1 else 0 end;
  if v_n < 2 then
    raise exception 'minimo_duas_partes';
  end if;

  v_total := round(v_item.preco_unitario * 100)::int;
  v_base := v_total / v_n;
  v_resto := v_total - v_base * v_n;

  if coalesce(p_inclui_origem, false) then
    -- a comanda atual fica com a primeira parte
    v_share := v_base + case when v_i < v_resto then 1 else 0 end;
    update public.comanda_itens set preco_unitario = v_share / 100.0 where id = p_item_id;
    v_i := 1;
  end if;

  foreach v_destino in array p_destinos loop
    v_share := v_base + case when v_i < v_resto then 1 else 0 end;

    if not coalesce(p_inclui_origem, false) and v_i = 0 then
      -- a comanda atual não paga parte: o item original vai inteiro para o 1º destino
      update public.comanda_itens
      set comanda_id = v_destino, preco_unitario = v_share / 100.0
      where id = p_item_id;
    else
      -- parte nova: sem produto (não mexe no estoque) e já entregue (não vai pra cozinha)
      insert into public.comanda_itens (
        restaurant_id, comanda_id, produto_id, nome_produto, preco_unitario, quantidade,
        observacao, status, setor, origem, divisao_de
      )
      values (
        v_item.restaurant_id, v_destino, null, v_item.nome_produto, v_share / 100.0, 1,
        v_item.observacao, 'entregue', v_item.setor, v_item.origem, v_item.id
      );
    end if;

    insert into public.comanda_item_divisoes (
      restaurant_id, tipo, item_id, nome_produto, comanda_origem_id, comanda_destino_id,
      origem_rotulo, destino_rotulo, quantidade, valor, garcom_nome
    )
    values (
      v_item.restaurant_id, 'igual', v_item.id, v_item.nome_produto, v_item.comanda_id, v_destino,
      public.rotulo_comanda(v_item.comanda_id), public.rotulo_comanda(v_destino),
      1, v_share / 100.0, v_garcom
    );

    v_i := v_i + 1;
  end loop;

  return jsonb_build_object('ok', true, 'partes', v_n);
end;
$$;

revoke all on function public.rotulo_comanda(uuid) from public, anon;
grant execute on function public.rotulo_comanda(uuid) to authenticated;
revoke all on function public.conferir_destino_divisao(uuid, uuid) from public, anon;
grant execute on function public.conferir_destino_divisao(uuid, uuid) to authenticated;
revoke all on function public.dividir_item_unidades(uuid, uuid, int, text) from public, anon;
grant execute on function public.dividir_item_unidades(uuid, uuid, int, text) to authenticated;
revoke all on function public.dividir_item_igual(uuid, uuid[], boolean, text) from public, anon;
grant execute on function public.dividir_item_igual(uuid, uuid[], boolean, text) to authenticated;
