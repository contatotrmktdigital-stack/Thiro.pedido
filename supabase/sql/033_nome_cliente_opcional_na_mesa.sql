-- ============================================================
-- Thiro.pedido — Nome do cliente opcional na comanda de MESA
--
-- O garçom pode informar o nome do cliente ao abrir a comanda
-- (só pra chamar a pessoa pelo nome na hora de entregar). Antes, a
-- regra "comandas_dados_por_tipo" PROIBIA nome em comanda de mesa.
-- Agora mesa aceita nome (opcional); delivery continua exigindo.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.comandas drop constraint if exists comandas_dados_por_tipo;

alter table public.comandas add constraint comandas_dados_por_tipo check (
  (tipo = 'mesa' and mesa_numero is not null and comanda_fisica_id is not null)
  or
  (tipo = 'balcao' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null)
  or
  (tipo = 'delivery' and mesa_numero is null and comanda_fisica_id is null and cliente_nome is not null)
);
