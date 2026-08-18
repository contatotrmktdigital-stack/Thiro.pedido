-- ============================================================
-- Thiro.pedido — Fase 6: Balcão/retirada e delivery
--
-- Até agora toda comanda era de mesa. Agora existem 3 tipos:
--   - mesa: como já era (mesa digitada + comanda física escolhida)
--   - balcao: sem mesa nem comanda física, só o nome do cliente
--   - delivery: nome, telefone, endereço e taxa de entrega
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_atendimento') then
    create type public.tipo_atendimento as enum ('mesa', 'balcao', 'delivery');
  end if;
end $$;

alter table public.comandas add column if not exists tipo public.tipo_atendimento not null default 'mesa';
alter table public.comandas alter column mesa_numero drop not null;

alter table public.comandas add column if not exists cliente_nome text;
alter table public.comandas add column if not exists cliente_telefone text;
alter table public.comandas add column if not exists endereco_entrega text;
alter table public.comandas add column if not exists taxa_entrega numeric(10,2) not null default 0;

comment on column public.comandas.tipo is 'Tipo de atendimento: mesa (salão), balcao (retirada) ou delivery.';
comment on column public.comandas.taxa_entrega is 'Taxa de entrega do delivery, somada ao total no fechamento pelo caixa.';

-- Limpa uma comanda de teste antiga que ficou sem comanda física vinculada
-- (resíduo de antes desse modelo ficar pronto — ver CLAUDE.md), pra não
-- travar a regra abaixo.
delete from public.comanda_itens
where comanda_id in (
  select id from public.comandas where tipo = 'mesa' and comanda_fisica_id is null
);
delete from public.comandas where tipo = 'mesa' and comanda_fisica_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comandas_dados_por_tipo'
  ) then
    alter table public.comandas add constraint comandas_dados_por_tipo check (
      (tipo = 'mesa' and mesa_numero is not null and comanda_fisica_id is not null and cliente_nome is null)
      or
      (tipo = 'balcao' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null)
      or
      (tipo = 'delivery' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null
        and cliente_telefone is not null and endereco_entrega is not null)
    );
  end if;
end $$;
