-- ============================================================
-- Thiro.pedido — Gestão pode apagar uma comanda fechada errada
--
-- Hoje não existe nenhuma permissão pra apagar uma comanda (só criar/
-- editar). Isso libera só a gestão a apagar comandas do próprio
-- restaurante — usado nos Relatórios pra corrigir uma comanda fechada
-- por engano (o valor some do faturamento junto).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

drop policy if exists "comandas_delete" on public.comandas;
create policy "comandas_delete" on public.comandas
  for delete
  using ( public.my_role() = 'gestao' and restaurant_id = public.my_restaurant_id() );
