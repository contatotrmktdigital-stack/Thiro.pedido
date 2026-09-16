-- ============================================================
-- Thiro.pedido — Corrige: cozinha não conseguia avançar o status
-- de um item depois que a comanda era fechada.
--
-- Causa raiz: a política "comanda_itens_update" (criada na Fase 5,
-- 007_fase5_caixa.sql) só permitia atualizar um item enquanto a
-- comanda estivesse com status "aberta" — pra QUALQUER papel,
-- inclusive a cozinha. O ajuste feito depois (cozinha continuar
-- vendo o pedido na tela mesmo com a comanda já fechada) resolveu
-- só a parte de exibir o item; a gravação do avanço de status
-- continuava bloqueada em silêncio pelo banco (sem erro visível).
--
-- Correção: a cozinha agora pode atualizar o status do item mesmo
-- com a comanda fechada. Garçom/gestão continuam só podendo mexer
-- nos itens enquanto a comanda está aberta (protege uma conta já
-- fechada/paga de ser alterada por engano).
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
      public.my_role() = 'cozinha'
      or (
        public.my_role() in ('garcom', 'gestao')
        and exists (select 1 from public.comandas c where c.id = comanda_id and c.status = 'aberta')
      )
    )
  );
