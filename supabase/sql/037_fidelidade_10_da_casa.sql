-- ============================================================
-- Thiro.pedido — Fase 2: Fidelidade por CPF + "10% da casa" com desconto
--
-- 1) Programa de fidelidade (opcional, DESLIGADO por padrão em cada restaurante):
--    - o cliente se cadastra pelo QR da comanda (nome, CPF, telefone, e-mail, aceite LGPD);
--    - no PRIMEIRO cadastro naquele restaurante ganha 10% de desconto nos produtos
--      daquela compra (uma vez por CPF por restaurante); o cadastro conta como visita nº 1;
--    - visitas seguintes: o garçom lança (fica PENDENTE) ou a Gestão lança (já aprovada,
--      no máximo 1 por dia por cliente); a Gestão aprova/recusa as pendentes;
--    - a Gestão cadastra prêmios por nº de visitas e registra os resgates.
-- 2) Comandas ganham campos de desconto (cliente vinculado, % e valor do desconto).
--    Fórmula nova: produtos − desconto → "10% da casa" sobre o valor JÁ com desconto
--    → + taxa de entrega.
--
-- CPF: nunca fica em texto puro. Guardamos (a) um "carimbo" HMAC (para achar/evitar
-- duplicado), (b) o CPF criptografado e (c) uma versão mascarada (***.456.789-**) para
-- exibir. A chave fica numa tabela que o app não consegue ler.
--
-- É ADITIVO: só cria tabelas/colunas/funções novas. Nenhum dado existente é alterado ou
-- apagado, e as rotas/QRs das comandas não mudam ("comanda_publica" só GANHA campos novos).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Configuração por restaurante (desligado por padrão)
-- ------------------------------------------------------------
alter table public.restaurants
  add column if not exists fidelidade_ativa boolean not null default false,
  add column if not exists google_avaliacao_url text;

comment on column public.restaurants.fidelidade_ativa is 'Liga o programa de fidelidade (cadastro por CPF no QR da comanda).';
comment on column public.restaurants.google_avaliacao_url is 'Link opcional para o cliente avaliar o restaurante no Google (não influencia o desconto).';

-- ------------------------------------------------------------
-- Chave secreta do CPF (gerada aqui dentro; ninguém do app lê)
-- ------------------------------------------------------------
create table if not exists public.fidelidade_config (
  chave text primary key,
  valor text not null
);

alter table public.fidelidade_config enable row level security;
revoke all on public.fidelidade_config from anon, authenticated;

insert into public.fidelidade_config (chave, valor)
values ('chave_cpf', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------
create table if not exists public.fidelidade_clientes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  nome text not null,
  cpf_hash text not null,
  cpf_cifrado bytea,
  cpf_mascara text not null,
  telefone text,
  email text,
  lgpd_aceite_at timestamptz not null default now(),
  lgpd_versao text not null,
  desconto_usado_em timestamptz,
  anonimizado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, cpf_hash)
);

comment on table public.fidelidade_clientes is 'Clientes do programa de fidelidade (um CPF por restaurante). Acesso só por funções.';

create table if not exists public.fidelidade_visitas (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cliente_id uuid not null references public.fidelidade_clientes(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada')),
  origem text not null check (origem in ('cadastro', 'atendente', 'gestao')),
  garcom_nome text,
  lancada_por uuid,
  decidida_por uuid,
  decidida_por_nome text,
  decidida_at timestamptz,
  dia date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now()
);

-- no máximo 1 visita (não recusada) por cliente por dia
create unique index if not exists fidelidade_visitas_uma_por_dia
  on public.fidelidade_visitas (cliente_id, dia)
  where status <> 'recusada';

create index if not exists fidelidade_visitas_pendentes
  on public.fidelidade_visitas (restaurant_id, status, created_at);

create table if not exists public.fidelidade_premios (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  visitas int not null check (visitas > 0),
  descricao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fidelidade_resgates (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cliente_id uuid not null references public.fidelidade_clientes(id) on delete cascade,
  premio_id uuid not null references public.fidelidade_premios(id) on delete cascade,
  premio_descricao text not null,
  visitas_no_resgate int not null,
  registrado_por uuid,
  created_at timestamptz not null default now(),
  unique (cliente_id, premio_id)
);

alter table public.fidelidade_clientes enable row level security;
alter table public.fidelidade_visitas enable row level security;
alter table public.fidelidade_premios enable row level security;
alter table public.fidelidade_resgates enable row level security;
-- clientes / visitas / resgates: SEM policies (só as funções abaixo acessam).

drop policy if exists "fidelidade_premios_select" on public.fidelidade_premios;
create policy "fidelidade_premios_select" on public.fidelidade_premios
  for select
  using (
    public.is_super_admin()
    or (restaurant_id = public.my_restaurant_id() and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa'))
  );

drop policy if exists "fidelidade_premios_insert" on public.fidelidade_premios;
create policy "fidelidade_premios_insert" on public.fidelidade_premios
  for insert
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao');

drop policy if exists "fidelidade_premios_update" on public.fidelidade_premios;
create policy "fidelidade_premios_update" on public.fidelidade_premios
  for update
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao')
  with check (restaurant_id = public.my_restaurant_id());
-- (sem DELETE: prêmio antigo é só desativado, pra não perder o histórico de resgates)

-- ------------------------------------------------------------
-- Campos novos na comanda (desconto)
-- ------------------------------------------------------------
alter table public.comandas
  add column if not exists cliente_fidelidade_id uuid references public.fidelidade_clientes(id) on delete set null,
  add column if not exists desconto_pct numeric(5,2) not null default 0,
  add column if not exists valor_desconto numeric(10,2) not null default 0;

comment on column public.comandas.cliente_fidelidade_id is 'Cliente do programa de fidelidade vinculado a esta comanda (cadastro pelo QR).';
comment on column public.comandas.desconto_pct is 'Percentual de desconto de fidelidade previsto (só sobre produtos).';
comment on column public.comandas.valor_desconto is 'Valor do desconto de fidelidade efetivamente aplicado no fechamento.';

-- ------------------------------------------------------------
-- Funções internas (CPF)
-- ------------------------------------------------------------
create or replace function public.fid_cpf_digitos(p text)
returns text
language sql
immutable
as $$ select regexp_replace(coalesce(p, ''), '\D', '', 'g') $$;

create or replace function public.fid_cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  d text := public.fid_cpf_digitos(p_cpf);
  s int;
  r int;
  i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then
    return false;
  end if;
  s := 0;
  for i in 1..9 loop
    s := s + substr(d, i, 1)::int * (11 - i);
  end loop;
  r := (s * 10) % 11;
  if r = 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::int then
    return false;
  end if;
  s := 0;
  for i in 1..10 loop
    s := s + substr(d, i, 1)::int * (12 - i);
  end loop;
  r := (s * 10) % 11;
  if r = 10 then r := 0; end if;
  return r = substr(d, 11, 1)::int;
end;
$$;

create or replace function public.fid_cpf_hash(p_cpf text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(
    extensions.hmac(
      public.fid_cpf_digitos(p_cpf),
      (select valor from public.fidelidade_config where chave = 'chave_cpf'),
      'sha256'
    ),
    'hex'
  )
$$;

create or replace function public.fid_visitas_aprovadas(p_cliente_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.fidelidade_visitas
  where cliente_id = p_cliente_id and status = 'aprovada'
$$;

revoke all on function public.fid_cpf_hash(text) from public, anon, authenticated;
revoke all on function public.fid_visitas_aprovadas(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- CLIENTE (sem login): cadastro pelo QR
-- ------------------------------------------------------------
create or replace function public.fidelidade_cadastrar(
  p_comanda_fisica_id uuid,
  p_nome text,
  p_cpf text,
  p_telefone text,
  p_email text,
  p_aceite boolean,
  p_lgpd_versao text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fisica record;
  v_rest record;
  v_comanda record;
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_cpf text := public.fid_cpf_digitos(p_cpf);
  v_tel text := public.fid_cpf_digitos(p_telefone);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_hash text;
  v_chave text;
  v_id uuid;
begin
  select cf.id, cf.restaurant_id into v_fisica
  from public.comandas_fisicas cf where cf.id = p_comanda_fisica_id;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrada');
  end if;

  select r.active, r.fidelidade_ativa into v_rest
  from public.restaurants r where r.id = v_fisica.restaurant_id;
  if not found or not v_rest.active or not v_rest.fidelidade_ativa then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  if not coalesce(p_aceite, false) then
    return jsonb_build_object('ok', false, 'erro', 'sem_aceite');
  end if;
  if length(v_nome) < 5 or position(' ' in v_nome) = 0 then
    return jsonb_build_object('ok', false, 'erro', 'nome_invalido');
  end if;
  if not public.fid_cpf_valido(v_cpf) then
    return jsonb_build_object('ok', false, 'erro', 'cpf_invalido');
  end if;
  if length(v_tel) < 10 or length(v_tel) > 13 then
    return jsonb_build_object('ok', false, 'erro', 'telefone_invalido');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'erro', 'email_invalido');
  end if;

  select c.id, c.cliente_nome, c.cliente_fidelidade_id into v_comanda
  from public.comandas c
  where c.comanda_fisica_id = v_fisica.id and c.status = 'aberta'
  order by c.created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'sem_comanda_aberta');
  end if;
  if v_comanda.cliente_fidelidade_id is not null then
    return jsonb_build_object('ok', false, 'erro', 'comanda_ja_vinculada');
  end if;

  v_hash := public.fid_cpf_hash(v_cpf);
  if exists (
    select 1 from public.fidelidade_clientes
    where restaurant_id = v_fisica.restaurant_id and cpf_hash = v_hash
  ) then
    return jsonb_build_object('ok', false, 'erro', 'ja_cadastrado');
  end if;

  select valor into v_chave from public.fidelidade_config where chave = 'chave_cpf';

  insert into public.fidelidade_clientes (
    restaurant_id, nome, cpf_hash, cpf_cifrado, cpf_mascara, telefone, email, lgpd_aceite_at, lgpd_versao
  )
  values (
    v_fisica.restaurant_id,
    v_nome,
    v_hash,
    extensions.pgp_sym_encrypt(v_cpf, v_chave),
    '***.' || substr(v_cpf, 4, 3) || '.' || substr(v_cpf, 7, 3) || '-**',
    v_tel,
    v_email,
    now(),
    coalesce(nullif(trim(p_lgpd_versao), ''), 'v1')
  )
  returning id into v_id;

  -- o cadastro conta como a visita nº 1
  insert into public.fidelidade_visitas (restaurant_id, cliente_id, status, origem, decidida_at)
  values (v_fisica.restaurant_id, v_id, 'aprovada', 'cadastro', now());

  -- vincula à comanda aberta e dá o desconto (só nos produtos, uma vez)
  update public.comandas
  set cliente_fidelidade_id = v_id,
      desconto_pct = 10,
      cliente_nome = coalesce(nullif(trim(cliente_nome), ''), split_part(v_nome, ' ', 1))
  where id = v_comanda.id;

  return jsonb_build_object('ok', true, 'desconto_pct', 10, 'visitas', 1);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'erro', 'ja_cadastrado');
end;
$$;

revoke all on function public.fidelidade_cadastrar(uuid, text, text, text, text, boolean, text) from public;
grant execute on function public.fidelidade_cadastrar(uuid, text, text, text, text, boolean, text) to anon, authenticated;

-- ------------------------------------------------------------
-- CLIENTE (sem login): consultar visitas informando o CPF
-- ------------------------------------------------------------
create or replace function public.fidelidade_consultar_publico(p_comanda_fisica_id uuid, p_cpf text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fisica record;
  v_rest record;
  v_cliente record;
  v_visitas int;
  v_prox record;
  v_disponiveis jsonb;
begin
  select cf.id, cf.restaurant_id into v_fisica
  from public.comandas_fisicas cf where cf.id = p_comanda_fisica_id;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrada');
  end if;

  select r.active, r.fidelidade_ativa into v_rest
  from public.restaurants r where r.id = v_fisica.restaurant_id;
  if not found or not v_rest.active or not v_rest.fidelidade_ativa then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  if not public.fid_cpf_valido(p_cpf) then
    return jsonb_build_object('ok', false, 'erro', 'cpf_invalido');
  end if;

  select c.id into v_cliente
  from public.fidelidade_clientes c
  where c.restaurant_id = v_fisica.restaurant_id
    and c.cpf_hash = public.fid_cpf_hash(p_cpf)
    and c.anonimizado_em is null;
  if not found then
    return jsonb_build_object('ok', true, 'cadastrado', false);
  end if;

  v_visitas := public.fid_visitas_aprovadas(v_cliente.id);

  select p.visitas, p.descricao into v_prox
  from public.fidelidade_premios p
  where p.restaurant_id = v_fisica.restaurant_id and p.ativo and p.visitas > v_visitas
  order by p.visitas
  limit 1;

  select coalesce(jsonb_agg(p.descricao order by p.visitas), '[]'::jsonb) into v_disponiveis
  from public.fidelidade_premios p
  where p.restaurant_id = v_fisica.restaurant_id and p.ativo and p.visitas <= v_visitas
    and not exists (
      select 1 from public.fidelidade_resgates r
      where r.cliente_id = v_cliente.id and r.premio_id = p.id
    );

  return jsonb_build_object(
    'ok', true,
    'cadastrado', true,
    'visitas', v_visitas,
    'proximo_premio', case when v_prox.visitas is null then null else v_prox.descricao end,
    'faltam', case when v_prox.visitas is null then null else v_prox.visitas - v_visitas end,
    'premios_disponiveis', v_disponiveis
  );
end;
$$;

revoke all on function public.fidelidade_consultar_publico(uuid, text) from public;
grant execute on function public.fidelidade_consultar_publico(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------
-- EQUIPE (logada): buscar cliente por CPF, nome, telefone ou e-mail
-- ------------------------------------------------------------
create or replace function public.fidelidade_buscar(p_termo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_termo text := trim(coalesce(p_termo, ''));
  v_dig text := public.fid_cpf_digitos(p_termo);
  v_res jsonb;
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;
  if length(v_termo) < 3 then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(x order by x.nome), '[]'::jsonb) into v_res
  from (
    select c.id, c.nome, c.cpf_mascara,
           public.fid_visitas_aprovadas(c.id) as visitas
    from public.fidelidade_clientes c
    where c.restaurant_id = v_rest
      and c.anonimizado_em is null
      and (
        (length(v_dig) = 11 and c.cpf_hash = public.fid_cpf_hash(v_dig))
        or c.nome ilike '%' || v_termo || '%'
        or c.email ilike '%' || v_termo || '%'
        or (length(v_dig) >= 4 and regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') like '%' || v_dig || '%')
      )
    order by c.nome
    limit 20
  ) x;

  return v_res;
end;
$$;

revoke all on function public.fidelidade_buscar(text) from public, anon;
grant execute on function public.fidelidade_buscar(text) to authenticated;

-- ------------------------------------------------------------
-- EQUIPE: lançar visita (atendente = fica pendente; gestão = já aprovada)
-- ------------------------------------------------------------
create or replace function public.fidelidade_lancar_visita(p_cliente_id uuid, p_origem text, p_garcom_nome text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_ok boolean;
  v_nome text;
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;
  if p_origem not in ('atendente', 'gestao') then
    return jsonb_build_object('ok', false, 'erro', 'origem_invalida');
  end if;

  select true into v_ok from public.fidelidade_clientes
  where id = p_cliente_id and restaurant_id = v_rest and anonimizado_em is null;
  if v_ok is null then
    return jsonb_build_object('ok', false, 'erro', 'cliente_nao_encontrado');
  end if;

  select full_name into v_nome from public.profiles where id = auth.uid();

  insert into public.fidelidade_visitas (
    restaurant_id, cliente_id, status, origem, garcom_nome, lancada_por,
    decidida_por, decidida_por_nome, decidida_at
  )
  values (
    v_rest, p_cliente_id,
    case when p_origem = 'gestao' then 'aprovada' else 'pendente' end,
    p_origem,
    nullif(trim(coalesce(p_garcom_nome, '')), ''),
    auth.uid(),
    case when p_origem = 'gestao' then auth.uid() else null end,
    case when p_origem = 'gestao' then v_nome else null end,
    case when p_origem = 'gestao' then now() else null end
  );

  return jsonb_build_object('ok', true, 'status', case when p_origem = 'gestao' then 'aprovada' else 'pendente' end);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'erro', 'ja_lancada_hoje');
end;
$$;

revoke all on function public.fidelidade_lancar_visita(uuid, text, text) from public, anon;
grant execute on function public.fidelidade_lancar_visita(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- EQUIPE/GESTÃO: visitas pendentes, aprovar/recusar
-- ------------------------------------------------------------
create or replace function public.fidelidade_pendentes()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'cliente', c.nome,
      'cpf', c.cpf_mascara,
      'garcom', v.garcom_nome,
      'lancada_em', v.created_at,
      'dia', v.dia
    ) order by v.created_at), '[]'::jsonb)
    from public.fidelidade_visitas v
    join public.fidelidade_clientes c on c.id = v.cliente_id
    where v.restaurant_id = v_rest and v.status = 'pendente'
  );
end;
$$;

create or replace function public.fidelidade_decidir(p_visita_id uuid, p_aprovar boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_nome text;
  v_qtd int;
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;
  select full_name into v_nome from public.profiles where id = auth.uid();

  update public.fidelidade_visitas
  set status = case when p_aprovar then 'aprovada' else 'recusada' end,
      decidida_por = auth.uid(),
      decidida_por_nome = v_nome,
      decidida_at = now()
  where restaurant_id = v_rest
    and status = 'pendente'
    and (p_visita_id is null or id = p_visita_id);
  get diagnostics v_qtd = row_count;

  return jsonb_build_object('ok', true, 'quantidade', v_qtd);
end;
$$;

revoke all on function public.fidelidade_pendentes() from public, anon;
grant execute on function public.fidelidade_pendentes() to authenticated;
revoke all on function public.fidelidade_decidir(uuid, boolean) from public, anon;
grant execute on function public.fidelidade_decidir(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- GESTÃO: ficha completa do cliente (contatos, histórico, prêmios)
-- ------------------------------------------------------------
create or replace function public.fidelidade_detalhe(p_cliente_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_c record;
  v_visitas int;
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;

  select * into v_c from public.fidelidade_clientes
  where id = p_cliente_id and restaurant_id = v_rest;
  if not found then
    return null;
  end if;

  v_visitas := public.fid_visitas_aprovadas(p_cliente_id);

  return jsonb_build_object(
    'id', v_c.id,
    'nome', v_c.nome,
    'cpf', v_c.cpf_mascara,
    'telefone', v_c.telefone,
    'email', v_c.email,
    'cadastrado_em', v_c.created_at,
    'lgpd_aceite_at', v_c.lgpd_aceite_at,
    'lgpd_versao', v_c.lgpd_versao,
    'desconto_usado_em', v_c.desconto_usado_em,
    'visitas', v_visitas,
    'historico', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', v.dia, 'status', v.status, 'origem', v.origem, 'garcom', v.garcom_nome,
        'decidida_por', v.decidida_por_nome, 'decidida_at', v.decidida_at
      ) order by v.created_at desc), '[]'::jsonb)
      from public.fidelidade_visitas v where v.cliente_id = p_cliente_id
    ),
    'premios', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'visitas', p.visitas, 'descricao', p.descricao,
        'alcancado', v_visitas >= p.visitas,
        'resgatado_em', r.created_at
      ) order by p.visitas), '[]'::jsonb)
      from public.fidelidade_premios p
      left join public.fidelidade_resgates r on r.premio_id = p.id and r.cliente_id = p_cliente_id
      where p.restaurant_id = v_rest and (p.ativo or r.id is not null)
    )
  );
end;
$$;

revoke all on function public.fidelidade_detalhe(uuid) from public, anon;
grant execute on function public.fidelidade_detalhe(uuid) to authenticated;

-- ------------------------------------------------------------
-- GESTÃO: registrar resgate de prêmio
-- ------------------------------------------------------------
create or replace function public.fidelidade_resgatar(p_cliente_id uuid, p_premio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_premio record;
  v_visitas int;
begin
  if v_rest is null then
    raise exception 'sem_permissao';
  end if;

  select p.id, p.descricao, p.visitas into v_premio
  from public.fidelidade_premios p
  where p.id = p_premio_id and p.restaurant_id = v_rest and p.ativo;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'premio_nao_encontrado');
  end if;

  if not exists (
    select 1 from public.fidelidade_clientes
    where id = p_cliente_id and restaurant_id = v_rest and anonimizado_em is null
  ) then
    return jsonb_build_object('ok', false, 'erro', 'cliente_nao_encontrado');
  end if;

  v_visitas := public.fid_visitas_aprovadas(p_cliente_id);
  if v_visitas < v_premio.visitas then
    return jsonb_build_object('ok', false, 'erro', 'visitas_insuficientes');
  end if;

  insert into public.fidelidade_resgates (restaurant_id, cliente_id, premio_id, premio_descricao, visitas_no_resgate, registrado_por)
  values (v_rest, p_cliente_id, v_premio.id, v_premio.descricao, v_visitas, auth.uid());

  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'erro', 'ja_resgatado');
end;
$$;

revoke all on function public.fidelidade_resgatar(uuid, uuid) from public, anon;
grant execute on function public.fidelidade_resgatar(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- LGPD: anonimizar um cliente (SÓ sob pedido, SÓ pelo super admin, NUNCA automático)
-- Remove nome, CPF, telefone e e-mail. As contagens de visitas/resgates continuam,
-- mas sem identificar ninguém. Para usar, no SQL Editor:
--   select public.fidelidade_anonimizar('ID-DO-CLIENTE');
-- (o ID aparece na ficha do cliente na Gestão)
-- ------------------------------------------------------------
create or replace function public.fidelidade_anonimizar(p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- no SQL Editor (sem login de app) é o dono da plataforma; no app, só super admin
  if auth.uid() is not null and not public.is_super_admin() then
    raise exception 'sem_permissao';
  end if;

  update public.fidelidade_clientes
  set nome = 'Cliente anonimizado',
      cpf_hash = 'anonimizado-' || id::text,
      cpf_cifrado = null,
      cpf_mascara = '***.***.***-**',
      telefone = null,
      email = null,
      anonimizado_em = now()
  where id = p_cliente_id and anonimizado_em is null;

  return jsonb_build_object('ok', found);
end;
$$;

revoke all on function public.fidelidade_anonimizar(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Fechou a comanda com desconto -> o desconto daquele CPF fica "usado"
-- ------------------------------------------------------------
create or replace function public.fid_marcar_desconto_usado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'fechada'
     and old.status is distinct from 'fechada'
     and new.cliente_fidelidade_id is not null
     and coalesce(new.valor_desconto, 0) > 0 then
    update public.fidelidade_clientes
    set desconto_usado_em = now()
    where id = new.cliente_fidelidade_id and desconto_usado_em is null;
  end if;
  return new;
end;
$$;

drop trigger if exists comandas_fid_desconto on public.comandas;
create trigger comandas_fid_desconto
after update of status on public.comandas
for each row execute function public.fid_marcar_desconto_usado();

-- ------------------------------------------------------------
-- Página pública do cliente: igual à 035, MAIS os dados de fidelidade/desconto
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

  select r.name, r.logo_url, r.cor_primaria, r.cardapio_url, r.cardapio_ativo, r.active,
         r.fidelidade_ativa, r.google_avaliacao_url
    into v_rest
  from public.restaurants r
  where r.id = v_fisica.restaurant_id;

  if not found or not v_rest.active then
    return null;
  end if;

  select c.id, c.mesa_numero, c.taxa_servico, c.created_at, c.cliente_nome,
         c.cliente_fidelidade_id, c.desconto_pct
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
        'cliente_nome', v_comanda.cliente_nome,
        'desconto_pct', coalesce(v_comanda.desconto_pct, 0)
      )
    end,
    'itens', v_itens,
    'chamados', v_chamados,
    'fidelidade', jsonb_build_object(
      'ativa', coalesce(v_rest.fidelidade_ativa, false),
      'cadastrado', v_comanda.cliente_fidelidade_id is not null,
      'google_url', case when v_rest.fidelidade_ativa then v_rest.google_avaliacao_url else null end
    )
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;
