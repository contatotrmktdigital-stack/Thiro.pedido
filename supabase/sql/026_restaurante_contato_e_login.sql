-- ============================================================
-- Thiro.pedido — Cadastro do restaurante: e-mail e telefone de
-- contato (opcionais) + login de acesso livre
--
-- "email" e "telefone" são só pra cadastro/contato no seu sistema
-- (não servem pra entrar). "login_acesso" guarda o login que o
-- super admin definiu pro restaurante (pode ser CPF, telefone, nome
-- da hamburgueria, e-mail...) — só pra exibir no painel. O login
-- de verdade fica no Supabase Auth, normalizado.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter table public.restaurants add column if not exists email text;
alter table public.restaurants add column if not exists telefone text;
alter table public.restaurants add column if not exists login_acesso text;

comment on column public.restaurants.email is 'E-mail de contato do restaurante (opcional) — só pra cadastro, não é o login.';
comment on column public.restaurants.telefone is 'Telefone de contato do restaurante (opcional) — só pra cadastro, não é o login.';
comment on column public.restaurants.login_acesso is 'Login de acesso definido pelo super admin ao criar o restaurante (só pra exibição no painel).';
