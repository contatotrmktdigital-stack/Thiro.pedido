-- ============================================================
-- Thiro.pedido — Chamados do cliente ("Chamar garçom" / "Pedir a conta")
--
-- O cliente que escaneia o QR da comanda toca em "Chamar garçom" ou
-- "Pedir a conta". Os dois viram um registro em "chamados" que a
-- equipe vê num sininho no topo (com o tipo diferenciado) e marca
-- como atendido.
--
-- Segurança: o cliente NÃO tem login, então nada é liberado direto
-- na tabela — ele só chama a função "chamar_atendimento", que valida
-- tudo (ficha existe, restaurante ativo, conta só com consumo) e
-- evita duplicar um chamado já pendente do mesmo tipo.
--
-- Também:
--  - fecha (marca como atendido) os chamados pendentes de uma
--    comanda quando ela é fechada;
--  - liga o Realtime da tabela, pro sininho atualizar na hora;
--  - redefine "comanda_publica" pra devolver os chamados pendentes
--    (o cliente vê "garçom avisado"). O resto da função é igual à 034.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

create table if not exists public.chamados (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  comanda_fisica_id uuid not null references public.comandas_fisicas(id) on delete cascade,
  comanda_id uuid references public.comandas(id) on delete cascade,
  tipo text not null check (tipo in ('garcom', 'conta')),
  status text not null default 'pendente' check (status in ('pendente', 'atendido')),
  created_at timestamptz not null default now(),
  atendido_at timestamptz
);

comment on table public.chamados is 'Pedidos do cliente (pelo QR da comanda) para chamar o garçom ou pedir a conta.';

-- no máximo 1 chamado pendente por ficha e tipo
create unique index if not exists chamados_um_pendente_por_tipo
  on public.chamados (comanda_fisica_id, tipo)
  where status = 'pendente';

create index if not exists chamados_restaurante_status
  on public.chamados (restaurant_id, status, created_at);

alter table public.chamados enable row level security;

drop policy if exists "chamados_select" on public.chamados;
create policy "chamados_select" on public.chamados
  for select
  using (
    public.is_super_admin()
    or (
      restaurant_id = public.my_restaurant_id()
      and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
    )
  );

drop policy if exists "chamados_update" on public.chamados;
create policy "chamados_update" on public.chamados
  for update
  using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chamados'
  ) then
    alter publication supabase_realtime add table public.chamados;
  end if;
end $$;

-- ------------------------------------------------------------
-- Cliente (sem login) cria o chamado
-- ------------------------------------------------------------
create or replace function public.chamar_atendimento(p_comanda_fisica_id uuid, p_tipo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fisica record;
  v_ativo boolean;
  v_comanda_id uuid;
  v_tem_itens boolean := false;
  v_existente uuid;
begin
  if p_tipo not in ('garcom', 'conta') then
    return jsonb_build_object('ok', false, 'erro', 'tipo_invalido');
  end if;

  select cf.id, cf.restaurant_id into v_fisica
  from public.comandas_fisicas cf
  where cf.id = p_comanda_fisica_id;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrada');
  end if;

  select r.active into v_ativo from public.restaurants r where r.id = v_fisica.restaurant_id;
  if not coalesce(v_ativo, false) then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrada');
  end if;

  select c.id into v_comanda_id
  from public.comandas c
  where c.comanda_fisica_id = v_fisica.id and c.status = 'aberta'
  order by c.created_at desc
  limit 1;

  if v_comanda_id is not null then
    select exists (
      select 1 from public.comanda_itens i
      where i.comanda_id = v_comanda_id and i.status <> 'cancelado'
    ) into v_tem_itens;
  end if;

  -- pedir a conta só faz sentido com consumo na comanda
  if p_tipo = 'conta' and not v_tem_itens then
    return jsonb_build_object('ok', false, 'erro', 'sem_consumo');
  end if;

  select ch.id into v_existente
  from public.chamados ch
  where ch.comanda_fisica_id = v_fisica.id and ch.tipo = p_tipo and ch.status = 'pendente';

  if v_existente is not null then
    return jsonb_build_object('ok', true, 'ja_existia', true);
  end if;

  insert into public.chamados (restaurant_id, comanda_fisica_id, comanda_id, tipo)
  values (v_fisica.restaurant_id, v_fisica.id, v_comanda_id, p_tipo);

  return jsonb_build_object('ok', true, 'ja_existia', false);
end;
$$;

revoke all on function public.chamar_atendimento(uuid, text) from public;
grant execute on function public.chamar_atendimento(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Comanda fechada = chamados dela ficam atendidos
-- ------------------------------------------------------------
create or replace function public.fechar_chamados_da_comanda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'fechada' and old.status is distinct from 'fechada' then
    update public.chamados
    set status = 'atendido', atendido_at = now()
    where status = 'pendente'
      and (comanda_id = new.id or comanda_fisica_id = new.comanda_fisica_id);
  end if;
  return new;
end;
$$;

drop trigger if exists comandas_fecha_chamados on public.comandas;
create trigger comandas_fecha_chamados
after update of status on public.comandas
for each row execute function public.fechar_chamados_da_comanda();

-- ------------------------------------------------------------
-- Página pública do cliente: agora também devolve os chamados pendentes
-- ------------------------------------------------------------
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
  v_chamados jsonb := '[]'::jsonb;
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

  select coalesce(jsonb_agg(ch.tipo), '[]'::jsonb)
    into v_chamados
  from public.chamados ch
  where ch.comanda_fisica_id = v_fisica.id and ch.status = 'pendente';

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
    'itens', v_itens,
    'chamados', v_chamados
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;
