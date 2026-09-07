-- ============================================================
-- Thiro.pedido — Chave Pix do restaurante (QR code com valor certo)
--
-- Guarda a chave Pix e a cidade do restaurante, usadas pra montar o
-- QR code Pix (padrão "Copia e Cola" do Banco Central) já com o
-- valor exato da comanda, na hora de fechar a conta. O QR é montado
-- inteiro no navegador — não manda nada pra nenhum serviço externo,
-- é só matemática em cima do padrão oficial do Pix.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants
  add column if not exists chave_pix text,
  add column if not exists pix_cidade text;

comment on column public.restaurants.chave_pix is 'Chave Pix do restaurante (CPF, CNPJ, e-mail, telefone ou chave aleatória) — usada só pra montar o QR code, nunca enviada a nenhum serviço externo.';
comment on column public.restaurants.pix_cidade is 'Cidade do restaurante, exigida pelo padrão do QR code Pix (ex: "Sao Paulo").';
