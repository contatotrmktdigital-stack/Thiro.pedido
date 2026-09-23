-- ============================================================
-- Thiro.pedido — Delivery volta a exigir o nome do cliente
--
-- A simplificação anterior (022) tirou nome/telefone/endereço do
-- delivery. O usuário pediu pra manter o nome do cliente (só
-- telefone e endereço saem mesmo) — ajuda a identificar o pedido
-- na tela, principalmente com mais de um delivery aberto ao mesmo
-- tempo.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas drop constraint if exists comandas_dados_por_tipo;

alter table public.comandas add constraint comandas_dados_por_tipo check (
  (tipo = 'mesa' and mesa_numero is not null and comanda_fisica_id is not null and cliente_nome is null)
  or
  (tipo = 'balcao' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null)
  or
  (tipo = 'delivery' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null)
);
