-- ============================================================
-- Thiro.pedido — Fase 4: cozinha em tempo real (KDS)
--
-- 1) A cozinha também precisa poder avançar o status dos itens
--    (pendente → preparo → pronto), então entra no grupo que pode
--    atualizar comanda_itens (antes só garçom/gestão podiam).
-- 2) Liga o Realtime pra tabela comanda_itens, pra tela da cozinha
--    atualizar sozinha assim que o garçom lança um item novo.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

drop policy if exists "comanda_itens_update" on public.comanda_itens;
create policy "comanda_itens_update" on public.comanda_itens
  for update
  using (
    public.my_role() in ('garcom', 'gestao', 'cozinha') and restaurant_id = public.my_restaurant_id()
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comanda_itens'
  ) then
    alter publication supabase_realtime add table public.comanda_itens;
  end if;
end $$;
