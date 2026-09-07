-- ============================================================
-- Thiro.pedido — Tipo da chave Pix (evita erro de formato)
--
-- Guarda o TIPO da chave Pix (cpf, cnpj, email, telefone, aleatoria)
-- além do valor, pra formatar certo automaticamente — em especial
-- telefone, que precisa do "+55" na frente pro banco reconhecer (foi
-- exatamente esse o problema encontrado: chave "67999014777" salva
-- sem o +55 dá "chave inexistente" no banco do cliente).
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants
  add column if not exists tipo_chave_pix text;

comment on column public.restaurants.tipo_chave_pix is 'Tipo da chave Pix: cpf, cnpj, email, telefone ou aleatoria — usado só pra formatar a chave certo (ex: telefone precisa do +55 na frente).';

-- Corrige a chave do Dil's Burguer, que foi salva como telefone sem o
-- +55 (por isso o banco do cliente não reconhecia a chave).
update public.restaurants
set chave_pix = '+5567999014777',
    tipo_chave_pix = 'telefone'
where name ilike '%Dil%Burg%';
