import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AdminPinGate from "./AdminPinGate";
import BarList from "../../components/charts/BarList";
import VerticalBars from "../../components/charts/VerticalBars";
import ConfirmButton from "../../components/ConfirmButton";
import { hojeString, diasAtras, inicioDoMes, toDateInputValue } from "../../lib/dateRanges";

const COR_PAGAMENTO = { dinheiro: "#2a78d6", debito: "#eb6834", credito: "#1baf7a", pix: "#eda100" };
const LABEL_PAGAMENTO = { dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito", pix: "Pix" };

const COR_TIPO = { mesa: "#2a78d6", balcao: "#eb6834", delivery: "#1baf7a" };
const LABEL_TIPO = { mesa: "Mesa", balcao: "Balcão", delivery: "Delivery" };

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function listaDeDias(inicio, fim) {
  const dias = [];
  const cursor = new Date(`${inicio}T00:00:00`);
  const ultimo = new Date(`${fim}T00:00:00`);
  while (cursor <= ultimo) {
    dias.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function RelatoriosContent() {
  const [dataInicial, setDataInicial] = useState(hojeString());
  const [dataFinal, setDataFinal] = useState(hojeString());
  const [comandas, setComandas] = useState([]);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRelatorio = async () => {
    setLoading(true);
    setError("");

    const { data: comandasData, error: comandasError } = await supabase
      .from("comandas")
      .select(
        "id, tipo, mesa_numero, cliente_nome, forma_pagamento, valor_total, valor_taxa_servico, fechada_at, comandas_fisicas(numero)"
      )
      .eq("status", "fechada")
      .gte("fechada_at", `${dataInicial}T00:00:00`)
      .lte("fechada_at", `${dataFinal}T23:59:59.999`)
      .order("fechada_at", { ascending: false });

    if (comandasError) {
      setError(comandasError.message);
      setLoading(false);
      return;
    }

    const comandaIds = (comandasData || []).map((c) => c.id);
    let itensData = [];
    if (comandaIds.length > 0) {
      const { data, error: itensError } = await supabase
        .from("comanda_itens")
        .select("nome_produto, quantidade, preco_unitario, comanda_id")
        .in("comanda_id", comandaIds)
        .neq("status", "cancelado");

      if (itensError) {
        setError(itensError.message);
        setLoading(false);
        return;
      }
      itensData = data || [];
    }

    setComandas(comandasData || []);
    setItens(itensData);
    setLoading(false);
  };

  useEffect(() => {
    loadRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicial, dataFinal]);

  const aplicarPreset = (inicio, fim) => {
    setDataInicial(inicio);
    setDataFinal(fim);
  };

  const handleApagarComanda = async (comanda) => {
    setError("");
    const { error: deleteError } = await supabase.from("comandas").delete().eq("id", comanda.id);
    if (deleteError) setError(deleteError.message);
    else await loadRelatorio();
  };

  const identificarComanda = (c) => {
    if (c.tipo === "mesa") return `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? "-"}`;
    if (c.tipo === "balcao") return `Balcão · ${c.cliente_nome || "-"}`;
    return `Delivery · ${c.cliente_nome || "-"}`;
  };

  if (loading) {
    return <p>Carregando relatório...</p>;
  }

  // A taxa de serviço (10%) é dinheiro dos garçons, não do estabelecimento — por isso o
  // faturamento aqui é sempre valor_total MENOS a taxa. Ver "Caixinha da equipe" para o valor
  // da taxa separado.
  const faturamentoDe = (c) => Number(c.valor_total || 0) - Number(c.valor_taxa_servico || 0);

  const totalFaturado = comandas.reduce((soma, c) => soma + faturamentoDe(c), 0);
  const numeroComandas = comandas.length;
  const ticketMedio = numeroComandas > 0 ? totalFaturado / numeroComandas : 0;

  const porFormaPagamento = Object.keys(LABEL_PAGAMENTO)
    .map((chave) => ({
      chave,
      label: LABEL_PAGAMENTO[chave],
      value: comandas.filter((c) => c.forma_pagamento === chave).reduce((soma, c) => soma + faturamentoDe(c), 0),
    }))
    .filter((item) => item.value > 0);

  const porTipo = Object.keys(LABEL_TIPO)
    .map((chave) => ({
      chave,
      label: LABEL_TIPO[chave],
      value: comandas.filter((c) => c.tipo === chave).reduce((soma, c) => soma + faturamentoDe(c), 0),
    }))
    .filter((item) => item.value > 0);

  const dias = listaDeDias(dataInicial, dataFinal);
  const porDia = dias.map((dia) => {
    const total = comandas
      .filter((c) => c.fechada_at && c.fechada_at.slice(0, 10) === dia)
      .reduce((soma, c) => soma + faturamentoDe(c), 0);
    const [, mes, diaNum] = dia.split("-");
    return { label: `${diaNum}/${mes}`, value: total };
  });

  const produtosMap = new Map();
  for (const item of itens) {
    const atual = produtosMap.get(item.nome_produto) || { quantidade: 0, faturamento: 0 };
    atual.quantidade += item.quantidade;
    atual.faturamento += item.preco_unitario * item.quantidade;
    produtosMap.set(item.nome_produto, atual);
  }
  const produtosRanking = Array.from(produtosMap.entries())
    .map(([nome, dados]) => ({ label: nome, value: dados.quantidade, faturamento: dados.faturamento }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Período</h2>
        <div className="inline-form">
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => aplicarPreset(hojeString(), hojeString())}>
            Hoje
          </button>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => aplicarPreset(diasAtras(6), hojeString())}>
            Últimos 7 dias
          </button>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => aplicarPreset(diasAtras(29), hojeString())}>
            Últimos 30 dias
          </button>
          <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={() => aplicarPreset(inicioDoMes(), hojeString())}>
            Este mês
          </button>
        </div>
        <div className="inline-form" style={{ marginBottom: 0 }}>
          <div className="field">
            <label>De</label>
            <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} max={dataFinal} />
          </div>
          <div className="field">
            <label>Até</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} min={dataInicial} max={hojeString()} />
          </div>
        </div>
      </div>

      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
        O faturamento abaixo não inclui a taxa de serviço (10%) — esse valor é da equipe, veja em{" "}
        <Link to="/gestao/administracao/caixinha">Caixinha da equipe</Link>.
      </p>

      <div className="role-grid" style={{ marginBottom: 18 }}>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Faturamento</p>
          <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {formatMoeda(totalFaturado)}
          </p>
        </div>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Comandas fechadas</p>
          <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {numeroComandas}
          </p>
        </div>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Ticket médio</p>
          <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {formatMoeda(ticketMedio)}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Faturamento por dia</h2>
        <VerticalBars items={porDia} valueFormatter={formatMoeda} />
      </div>

      <div className="role-grid">
        <div className="card" style={{ margin: 0 }}>
          <h2>Por forma de pagamento</h2>
          <BarList
            items={porFormaPagamento.map((item) => ({ label: item.label, value: item.value }))}
            valueFormatter={formatMoeda}
            colorFor={(item) => {
              const chave = Object.keys(LABEL_PAGAMENTO).find((k) => LABEL_PAGAMENTO[k] === item.label);
              return COR_PAGAMENTO[chave];
            }}
          />
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h2>Por tipo de atendimento</h2>
          <BarList
            items={porTipo.map((item) => ({ label: item.label, value: item.value }))}
            valueFormatter={formatMoeda}
            colorFor={(item) => {
              const chave = Object.keys(LABEL_TIPO).find((k) => LABEL_TIPO[k] === item.label);
              return COR_TIPO[chave];
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Comandas fechadas no período</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8, fontSize: "0.85rem" }}>
          Fechou alguma sem querer errada? Apague aqui — ela e o valor somem do faturamento na
          hora.
        </p>
        {comandas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda fechada no período.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Data/hora</th>
                <th>Comanda</th>
                <th>Pagamento</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c) => (
                <tr key={c.id}>
                  <td>
                    {new Date(c.fechada_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{identificarComanda(c)}</td>
                  <td>{LABEL_PAGAMENTO[c.forma_pagamento] || "-"}</td>
                  <td>{formatMoeda(faturamentoDe(c))}</td>
                  <td>
                    <ConfirmButton onConfirm={() => handleApagarComanda(c)} confirmLabel="Apagar de vez?">
                      Apagar
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Produtos mais vendidos</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8, fontSize: "0.85rem" }}>
          Por quantidade vendida no período.
        </p>
        <BarList items={produtosRanking} valueFormatter={(v) => `${v} un`} />
      </div>
    </div>
  );
}

export default function RelatoriosAdmin() {
  return (
    <AdminPinGate>
      <RelatoriosContent />
    </AdminPinGate>
  );
}
