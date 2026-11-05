-- ============================================================
-- Thiro.pedido — Impressão térmica: configuração por restaurante
--
-- Cada restaurante configura (em Gestão › Impressão) o modelo da sua
-- impressora, o tamanho do papel, o que imprime e o texto do cabeçalho
-- e do rodapé. Uma linha por restaurante.
--
-- É ADITIVO: só cria uma tabela nova. Nada existente é alterado ou apagado.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

create table if not exists public.impressao_config (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  modelo text not null default 'generica-80',
  largura_papel_mm int not null default 80 check (largura_papel_mm between 30 and 120),
  area_impressao_mm int not null default 72 check (area_impressao_mm between 30 and 120),
  colunas int not null default 48 check (colunas between 16 and 80),
  tamanho_letra int not null default 100 check (tamanho_letra between 70 and 200),
  codepage int not null default 3 check (codepage between 0 and 255),
  metodo text not null default 'navegador' check (metodo in ('navegador', 'direta')),
  cabecalho text,
  rodape text,
  imprimir_conta boolean not null default true,
  conta_ao_fechar boolean not null default false,
  vias_conta int not null default 1 check (vias_conta between 1 and 5),
  imprimir_cozinha boolean not null default false,
  imprimir_bar boolean not null default false,
  vias_pedido int not null default 1 check (vias_pedido between 1 and 5),
  updated_at timestamptz not null default now()
);

comment on table public.impressao_config is 'Configuração de impressão térmica de cada restaurante (modelo, papel, o que imprime).';

alter table public.impressao_config enable row level security;

drop policy if exists "impressao_config_select" on public.impressao_config;
create policy "impressao_config_select" on public.impressao_config
  for select
  using (public.is_super_admin() or restaurant_id = public.my_restaurant_id());

drop policy if exists "impressao_config_insert" on public.impressao_config;
create policy "impressao_config_insert" on public.impressao_config
  for insert
  with check (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao');

drop policy if exists "impressao_config_update" on public.impressao_config;
create policy "impressao_config_update" on public.impressao_config
  for update
  using (restaurant_id = public.my_restaurant_id() and public.my_role() = 'gestao')
  with check (restaurant_id = public.my_restaurant_id());
-- (sem DELETE: a configuração só é editada)
