-- ============================================================
-- Thiro.pedido — Setor Cozinha / Bar nos produtos
--
-- Cada produto ganha um "setor" (cozinha ou bar). O setor serve para
-- SEPARAR os números nos relatórios e no histórico de pedidos. A fila
-- da cozinha continua uma só.
--
-- - produtos.setor: padrão "cozinha". Nos produtos que já existem, o
--   setor inicial é SUGERIDO pelo nome da categoria (Bebidas, Drinks,
--   Doses -> bar; o resto -> cozinha). Dá para trocar depois no Cardápio.
--   (A sugestão roda só na primeira vez; rodar de novo NÃO desfaz o que
--   você mudou.)
-- - comanda_itens.setor: cada item lançado guarda o setor do produto NO
--   MOMENTO do pedido. Assim, se você trocar o setor de um produto no
--   futuro, o histórico antigo não muda. Itens sem produto (valor
--   avulso) ficam sem setor.
--
-- É ADITIVO: só cria colunas e um gatilho novos. Nenhum dado existente
-- é apagado e a baixa de estoque não é afetada.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'produtos' and column_name = 'setor'
  ) then
    alter table public.produtos
      add column setor text not null default 'cozinha' check (setor in ('cozinha', 'bar'));

    -- sugestão inicial pela categoria (só nesta primeira vez)
    update public.produtos p
    set setor = 'bar'
    from public.categorias c
    where c.id = p.categoria_id
      and c.nome ~* '(bebida|drink|dose)';
  end if;
end $$;

comment on column public.produtos.setor is 'Setor que prepara o produto: cozinha ou bar. Usado para separar relatórios e histórico.';

alter table public.comanda_itens
  add column if not exists setor text check (setor in ('cozinha', 'bar'));

comment on column public.comanda_itens.setor is 'Setor do produto no momento do pedido (cozinha ou bar). Vazio em itens sem produto (valor avulso).';

-- itens já lançados: copia o setor do produto (só os que ainda estão vazios)
update public.comanda_itens i
set setor = p.setor
from public.produtos p
where p.id = i.produto_id and i.setor is null;

-- itens novos: pegam o setor do produto automaticamente
create or replace function public.comanda_itens_define_setor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.setor is null and new.produto_id is not null then
    select p.setor into new.setor from public.produtos p where p.id = new.produto_id;
  end if;
  return new;
end;
$$;

drop trigger if exists comanda_itens_setor on public.comanda_itens;
create trigger comanda_itens_setor
before insert on public.comanda_itens
for each row execute function public.comanda_itens_define_setor();
