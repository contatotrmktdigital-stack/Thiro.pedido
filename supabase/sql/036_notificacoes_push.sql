-- ============================================================
-- Thiro.pedido — Notificações push (Fase 1)
--
-- Avisa o celular/computador da equipe mesmo com o site fechado:
--   - pedido novo na comanda  -> aparelhos da área COZINHA
--   - cliente chamou o garçom / pediu a conta (QR) -> aparelhos de GARÇOM, COZINHA e GESTÃO
--
-- Como funciona:
--  1) Cada aparelho que tocar em "Ativar avisos" vira uma linha em "push_subscriptions".
--  2) Quando entra um item (comanda_itens) ou um chamado (chamados), um gatilho
--     chama a função "push_enviar", que manda a lista de aparelhos + o texto
--     para o endereço /api/push do site (função da Vercel). Ela dispara a notificação.
--  3) A conversa banco -> site é protegida por um segredo guardado em "push_config"
--     (tabela que ninguém lê pelo app; só o próprio banco).
--
-- É ADITIVO: só cria tabelas/funções/gatilhos novos. Não mexe em nenhum dado
-- nem em nenhuma tabela existente, e se o aviso falhar o pedido é salvo normalmente.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- Depois rode a linha do segredo (passada no chat) para ligar os avisos.
-- ============================================================

create extension if not exists pg_net;

-- ------------------------------------------------------------
-- Aparelhos inscritos
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  area text not null check (area in ('garcom', 'cozinha', 'gestao')),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Aparelhos da equipe inscritos para receber notificações push, por área (garcom/cozinha/gestao).';

create index if not exists push_subscriptions_restaurante_area
  on public.push_subscriptions (restaurant_id, area);

alter table public.push_subscriptions enable row level security;

-- A equipe só enxerga e mexe nos aparelhos do PRÓPRIO restaurante.
drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
create policy "push_subscriptions_select" on public.push_subscriptions
  for select
  using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
  );

drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert
  with check (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
  );

drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
create policy "push_subscriptions_update" on public.push_subscriptions
  for update
  using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
  )
  with check (restaurant_id = public.my_restaurant_id());

drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;
create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete
  using (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa')
  );

-- ------------------------------------------------------------
-- Configuração secreta (endereço do site + segredo). Sem nenhuma policy:
-- o app (anon/authenticated) não consegue ler; só funções do banco.
-- ------------------------------------------------------------
create table if not exists public.push_config (
  chave text primary key,
  valor text not null
);

alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- ------------------------------------------------------------
-- Envio (nunca derruba o pedido: qualquer erro vira só um aviso no log)
-- ------------------------------------------------------------
create or replace function public.push_enviar(
  p_restaurant_id uuid,
  p_areas text[],
  p_titulo text,
  p_corpo text,
  p_url text,
  p_tag text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_segredo text;
  v_subs jsonb;
begin
  select valor into v_url from public.push_config where chave = 'url';
  select valor into v_segredo from public.push_config where chave = 'segredo';
  if v_url is null or v_segredo is null then
    return; -- avisos ainda não ligados
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'area', area
           )),
           '[]'::jsonb
         )
    into v_subs
    from public.push_subscriptions
   where restaurant_id = p_restaurant_id
     and area = any (p_areas);

  if jsonb_array_length(v_subs) = 0 then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'subscriptions', v_subs,
      'titulo', p_titulo,
      'corpo', p_corpo,
      'url', p_url,
      'tag', p_tag
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_segredo)
  );
exception when others then
  raise warning 'push_enviar falhou: %', sqlerrm;
end;
$$;

revoke all on function public.push_enviar(uuid, text[], text, text, text, text)
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- Gatilho: pedido novo -> cozinha
-- (por comando: se o garçom lança 3 itens de uma vez, vai UM aviso só)
-- ------------------------------------------------------------
create or replace function public.trg_push_itens_novos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_local text;
begin
  for r in
    select n.restaurant_id,
           n.comanda_id,
           count(*)::int as qtd,
           string_agg(n.quantidade || 'x ' || n.nome_produto, ', ' order by n.created_at) as resumo
      from novos n
     where n.status = 'pendente'
     group by n.restaurant_id, n.comanda_id
  loop
    select case
             when c.tipo = 'mesa' then 'Mesa ' || coalesce(c.mesa_numero::text, '?')
             else 'Delivery' || coalesce(' · ' || c.cliente_nome, '')
           end
      into v_local
      from public.comandas c
     where c.id = r.comanda_id;

    perform public.push_enviar(
      r.restaurant_id,
      array['cozinha'],
      case when r.qtd = 1 then 'Novo pedido' else r.qtd || ' itens novos' end,
      coalesce(v_local, 'Comanda') || ': ' || left(r.resumo, 140),
      '@area',
      'pedido-' || r.comanda_id
    );
  end loop;
  return null;
exception when others then
  raise warning 'trg_push_itens_novos falhou: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists comanda_itens_push_novos on public.comanda_itens;
create trigger comanda_itens_push_novos
  after insert on public.comanda_itens
  referencing new table as novos
  for each statement
  execute function public.trg_push_itens_novos();

-- ------------------------------------------------------------
-- Gatilho: cliente chamou o garçom / pediu a conta -> garçom, cozinha e gestão
-- ------------------------------------------------------------
create or replace function public.trg_push_chamado_novo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local text;
  v_numero text;
begin
  select cf.numero::text into v_numero
    from public.comandas_fisicas cf
   where cf.id = new.comanda_fisica_id;

  select case
           when c.tipo = 'mesa' and c.mesa_numero is not null
             then 'Mesa ' || c.mesa_numero || coalesce(' · ' || c.cliente_nome, '')
           else null
         end
    into v_local
    from public.comandas c
   where c.id = new.comanda_id;

  v_local := coalesce(v_local, 'Comanda ' || coalesce(v_numero, ''));

  perform public.push_enviar(
    new.restaurant_id,
    array['garcom', 'cozinha', 'gestao'],
    case when new.tipo = 'conta' then 'Pediram a conta' else 'Chamaram o garçom' end,
    v_local || case when new.tipo = 'conta' then ' pediu a conta' else ' está chamando' end,
    '@area',
    'chamado-' || new.id
  );
  return new;
exception when others then
  raise warning 'trg_push_chamado_novo falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists chamados_push_novo on public.chamados;
create trigger chamados_push_novo
  after insert on public.chamados
  for each row
  execute function public.trg_push_chamado_novo();
