import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AdminPinGate from "./AdminPinGate";
import { hojeString, diasAtras, inicioDoMes } from "../../lib/dateRanges";

const LABEL_STATUS = {
  pendente: "Pendente",
  preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function identificarComanda(c) {
  if (!c) return "-";
  if (c.tipo === "mesa") return `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? "-"}`;
  if (c.tipo === "balcao") return `Balcão · ${c.cliente_nome || "-"}`;
  return c.cliente_nome ? `Delivery · ${c.cliente_nome}` : "Delivery";
}

function HistoricoContent() {
  const [dataInicial, setDataInicial] = useState(hojeString());
  const [dataFinal, setDataFinal] = useState(hojeString());
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistorico = async () => {
    setLoading(true);
    setError("");

    // Filtra por quando o item foi LANÇADO (não pela comanda estar fechada) — assim mostra o
    // pedido do dia mesmo se a conta ainda não foi paga.
    const { data, error: fetchError } = await supabase
      .from("comanda_itens")
      .select(
        "id, nome_produto, quantidade, preco_unitario, observacao, status, created_at, comandas(tipo, mesa_numero, cliente_nome, comandas_fisicas(numero))"
      )
      .gte("created_at", `${dataInicial}T00:00:00`)
      .lte("created_at", `${dataFinal}T23:59:59.999`)
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setItens(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicial, dataFinal]);

  const aplicarPreset = (inicio, fim) => {
    setDataInicial(inicio);
    setDataFinal(fim);
  };

  if (loading) {
    return <p>Carregando histórico...</p>;
  }

  const totalItens = itens.length;
  const totalValor = itens
    .filter((i) => i.status !== "cancelado")
    .reduce((soma, i) => soma + i.preco_unitario * i.quantidade, 0);

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

      <div className="role-grid" style={{ marginBottom: 18 }}>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Pedidos lançados</p>
          <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {totalItens}
          </p>
        </div>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
            Valor (sem os cancelados)
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {formatMoeda(totalValor)}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Pedidos do período</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8, fontSize: "0.85rem" }}>
          Todo item lançado no período, esteja a comanda paga ou não.
        </p>
        {itens.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum pedido lançado no período.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Comanda</th>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} style={item.status === "cancelado" ? { opacity: 0.55 } : undefined}>
                  <td>
                    {new Date(item.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{identificarComanda(item.comandas)}</td>
                  <td style={item.status === "cancelado" ? { textDecoration: "line-through" } : undefined}>
                    {item.nome_produto}
                    {item.observacao && (
                      <div style={{ color: "var(--color-red-700)", fontWeight: 700, fontSize: "0.8rem" }}>
                        Obs: {item.observacao}
                      </div>
                    )}
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{formatMoeda(item.preco_unitario * item.quantidade)}</td>
                  <td>
                    <span className={`status-pill ${item.status === "entregue" ? "active" : "inactive"}`}>
                      {LABEL_STATUS[item.status] || item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function HistoricoPedidosAdmin() {
  return (
    <AdminPinGate>
      <HistoricoContent />
    </AdminPinGate>
  );
}
