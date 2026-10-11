-- ============================================================
-- Thiro.pedido — Login único: a cozinha agora é uma ÁREA do login
-- do restaurante (papel "gestao"), não mais uma conta separada.
--
-- A política de atualização dos itens da comanda só deixava o papel
-- "cozinha" avançar o status de um item mesmo com a comanda já
-- fechada. Como o login único é "gestao", ele precisa do mesmo
-- direito (senão a cozinha trava quando o cliente paga antes do
-- pedido ficar pronto). Garçom (papel antigo) continua só mexendo
-- em comanda aberta.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

drop policy if exists "comanda_itens_update" on public.comanda_itens;
create policy "comanda_itens_update" on public.comanda_itens
  for update
  using (
    restaurant_id = public.my_restaurant_id()
    and (
      public.my_role() in ('cozinha', 'gestao')
      or (
        public.my_role() = 'garcom'
        and exists (select 1 from public.comandas c where c.id = comanda_id and c.status = 'aberta')
      )
    )
  );
