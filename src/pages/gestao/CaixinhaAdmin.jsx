import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AdminPinGate from "./AdminPinGate";
import { hojeString, diasAtras, inicioDoMes } from "../../lib/dateRanges";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CaixinhaContent() {
  const [dataInicial, setDataInicial] = useState(hojeString());
  const [dataFinal, setDataFinal] = useState(hojeString());
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCaixinha = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("comandas")
      .select("id, valor_taxa_servico, fechada_at")
      .eq("status", "fechada")
      .gt("valor_taxa_servico", 0)
      .gte("fechada_at", `${dataInicial}T00:00:00`)
      .lte("fechada_at", `${dataFinal}T23:59:59.999`);

    if (fetchError) setError(fetchError.message);
    else setComandas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCaixinha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicial, dataFinal]);

  const aplicarPreset = (inicio, fim) => {
    setDataInicial(inicio);
    setDataFinal(fim);
  };

  if (loading) {
    return <p>Carregando...</p>;
  }

  const totalCaixinha = comandas.reduce((soma, c) => soma + Number(c.valor_taxa_servico || 0), 0);

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Caixinha da equipe</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Total da taxa de serviço (10%) cobrada dos clientes no período — é dinheiro da equipe,
          não entra no faturamento do estabelecimento. Como dividir isso entre os garçons é um
          acerto de vocês.
        </p>

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

      <div className="role-grid">
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
            Caixinha no período
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {formatMoeda(totalCaixinha)}
          </p>
        </div>
        <div className="role-grid-item">
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
            Comandas com taxa cobrada
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 700, color: "var(--color-blue-900)" }}>
            {comandas.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CaixinhaAdmin() {
  return (
    <AdminPinGate>
      <CaixinhaContent />
    </AdminPinGate>
  );
}
