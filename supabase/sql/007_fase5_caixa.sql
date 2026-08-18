-- ============================================================
-- Thiro.pedido — Fase 5: Caixa (fechamento de conta, pagamento)
--
-- 1) Colunas novas em "comandas" pra guardar o resultado do
--    fechamento: forma de pagamento e o total cobrado (com ou sem
--    taxa de serviço, decidido pelo caixa na hora).
-- 2) Caixa entra no grupo que pode atualizar "comandas" (fechar).
-- 3) Trava: depois que a comanda é fechada, ninguém mais consegue
--    inserir/editar/excluir itens dela (evita mexer numa conta já
--    fechada e paga).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'forma_pagamento') then
    create type public.forma_pagamento as enum ('dinheiro', 'debito', 'credito', 'pix');
  end if;
end $$;

alter table public.comandas add column if not exists forma_pagamento public.forma_pagamento;
alter table public.comandas add column if not exists valor_total numeric(10,2);

comment on column public.comandas.forma_pagamento is 'Forma de pagamento registrada pelo caixa ao fechar (a cobrança em si acontece na maquininha, fora do sistema).';
comment on column public.comandas.valor_total is 'Total cobrado no fechamento, já considerando a taxa de serviço se estava ligada.';

drop policy if exists "comandas_update" on public.comandas;
create policy "comandas_update" on public.comandas
  for update
  using (
    public.my_role() in ('garcom', 'gestao', 'caixa') and restaurant_id = public.my_restaurant_id()
  );

drop policy if exists "comanda_itens_insert" on public.comanda_itens;
create policy "comanda_itens_insert" on public.comanda_itens
  for insert
  with check (
    public.my_role() in ('garcom', 'gestao')
    and restaurant_id = public.my_restaurant_id()
    and exists (select 1 from public.comandas c where c.id = comanda_id and c.status = 'aberta')
  );

drop policy if exists "comanda_itens_update" on public.comanda_itens;
create policy "comanda_itens_update" on public.comanda_itens
  for update
  using (
    public.my_role() in ('garcom', 'gestao', 'cozinha')
    and restaurant_id = public.my_restaurant_id()
    and exists (select 1 from public.comandas c where c.id = comanda_id and c.status = 'aberta')
  );

drop policy if exists "comanda_itens_delete" on public.comanda_itens;
create policy "comanda_itens_delete" on public.comanda_itens
  for delete
  using (
    public.my_role() in ('garcom', 'gestao')
    and restaurant_id = public.my_restaurant_id()
    and exists (select 1 from public.comandas c where c.id = comanda_id and c.status = 'aberta')
  );
