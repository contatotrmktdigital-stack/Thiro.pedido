-- ============================================================
-- Thiro.pedido — Pagamento dividido
--
-- Uma comanda pode ser paga em várias partes (ex.: R$ 30 em dinheiro
-- + R$ 49,20 no Pix). Cada parte vira uma linha em "comanda_pagamentos".
-- A comanda fica com forma_pagamento = 'dividido'. O pagamento único
-- continua exatamente como era (colunas da própria comanda).
--
-- A função "fechar_comanda_dividida" faz TUDO numa tacada só: confere
-- que a soma das partes é igual ao total, grava as partes e fecha a
-- comanda. Se qualquer coisa falhar, nada é gravado.
--
-- É ADITIVO: valor novo na lista de formas de pagamento, tabela nova e
-- função nova. Nenhum dado existente é alterado ou apagado.
--
-- Como usar: cole este arquivo inteiro no Supabase Dashboard,
-- em "SQL Editor" > "New query", e clique em "Run".
-- ============================================================

alter type public.forma_pagamento add value if not exists 'dividido';

create table if not exists public.comanda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  forma text not null check (forma in ('dinheiro', 'debito', 'credito', 'pix')),
  valor numeric(10,2) not null check (valor > 0),
  valor_recebido numeric(10,2),
  troco numeric(10,2),
  created_at timestamptz not null default now()
);

comment on table public.comanda_pagamentos is 'Partes de um pagamento dividido (uma linha por forma de pagamento usada na comanda).';

create index if not exists comanda_pagamentos_comanda on public.comanda_pagamentos (comanda_id);
create index if not exists comanda_pagamentos_restaurante on public.comanda_pagamentos (restaurant_id, created_at);

alter table public.comanda_pagamentos enable row level security;

drop policy if exists "comanda_pagamentos_select" on public.comanda_pagamentos;
create policy "comanda_pagamentos_select" on public.comanda_pagamentos
  for select
  using (
    public.is_super_admin()
    or (restaurant_id = public.my_restaurant_id() and public.my_role() in ('gestao', 'garcom', 'cozinha', 'caixa'))
  );

drop policy if exists "comanda_pagamentos_insert" on public.comanda_pagamentos;
create policy "comanda_pagamentos_insert" on public.comanda_pagamentos
  for insert
  with check (
    restaurant_id = public.my_restaurant_id()
    and public.my_role() in ('gestao', 'garcom', 'caixa')
  );
-- (sem UPDATE/DELETE: o registro do pagamento não pode ser alterado depois)

-- ------------------------------------------------------------
-- Fecha a comanda com o pagamento dividido (tudo ou nada).
-- Roda com as permissões de quem chama (as regras de segurança valem).
-- ------------------------------------------------------------
create or replace function public.fechar_comanda_dividida(
  p_comanda_id uuid,
  p_taxa_servico boolean,
  p_valor_desconto numeric,
  p_valor_taxa_servico numeric,
  p_valor_total numeric,
  p_partes jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_rest uuid;
  v_status text;
  v_parte jsonb;
  v_forma text;
  v_valor numeric;
  v_rec numeric;
  v_troco numeric;
  v_soma numeric := 0;
  v_troco_total numeric := 0;
  v_linhas int;
begin
  select c.restaurant_id, c.status::text into v_rest, v_status
  from public.comandas c where c.id = p_comanda_id;
  if v_rest is null then
    raise exception 'comanda_nao_encontrada';
  end if;
  if v_status <> 'aberta' then
    raise exception 'comanda_nao_esta_aberta';
  end if;
  if jsonb_typeof(p_partes) <> 'array' or jsonb_array_length(p_partes) < 2 then
    raise exception 'minimo_duas_partes';
  end if;

  for v_parte in select * from jsonb_array_elements(p_partes) loop
    v_forma := v_parte ->> 'forma';
    v_valor := round((v_parte ->> 'valor')::numeric, 2);
    v_rec := nullif(v_parte ->> 'valor_recebido', '')::numeric;

    if v_forma is null or v_forma not in ('dinheiro', 'debito', 'credito', 'pix') then
      raise exception 'forma_invalida';
    end if;
    if v_valor is null or v_valor <= 0 then
      raise exception 'valor_invalido';
    end if;

    if v_forma = 'dinheiro' then
      v_rec := round(v_rec, 2);
      if v_rec is null or v_rec < v_valor then
        raise exception 'dinheiro_sem_valor_recebido';
      end if;
      v_troco := v_rec - v_valor;
    else
      v_rec := null;
      v_troco := null;
    end if;

    insert into public.comanda_pagamentos (restaurant_id, comanda_id, forma, valor, valor_recebido, troco)
    values (v_rest, p_comanda_id, v_forma, v_valor, v_rec, v_troco);

    v_soma := v_soma + v_valor;
    v_troco_total := v_troco_total + coalesce(v_troco, 0);
  end loop;

  if round(v_soma, 2) <> round(p_valor_total, 2) then
    raise exception 'soma_diferente_do_total';
  end if;

  update public.comandas
  set status = 'fechada',
      taxa_servico = p_taxa_servico,
      forma_pagamento = 'dividido',
      valor_recebido = null,
      troco = v_troco_total,
      valor_desconto = coalesce(p_valor_desconto, 0),
      valor_taxa_servico = coalesce(p_valor_taxa_servico, 0),
      valor_total = round(p_valor_total, 2),
      fechada_at = now()
  where id = p_comanda_id and status = 'aberta';
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'nao_foi_possivel_fechar';
  end if;

  return jsonb_build_object('ok', true, 'partes', jsonb_array_length(p_partes), 'troco', v_troco_total);
end;
$$;

revoke all on function public.fechar_comanda_dividida(uuid, boolean, numeric, numeric, numeric, jsonb) from public, anon;
grant execute on function public.fechar_comanda_dividida(uuid, boolean, numeric, numeric, numeric, jsonb) to authenticated;
