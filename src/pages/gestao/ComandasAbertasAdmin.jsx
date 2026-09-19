import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AdminPinGate from "./AdminPinGate";
import ConfirmButton from "../../components/ConfirmButton";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function identificarComanda(c) {
  if (c.tipo === "mesa") return `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? "-"}`;
  if (c.tipo === "balcao") return `Balcão · ${c.cliente_nome || "-"}`;
  return `Delivery · ${c.cliente_nome || "-"}`;
}

function ComandasAbertasContent() {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const loadComandas = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("comandas")
      .select(
        "id, tipo, mesa_numero, cliente_nome, created_at, comandas_fisicas(numero), comanda_itens(preco_unitario, quantidade, status)"
      )
      .eq("status", "aberta")
      .order("created_at");

    if (fetchError) setError(fetchError.message);
    else setComandas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadComandas();
  }, []);

  const handleFecharSemContar = async (comanda) => {
    setBusyId(comanda.id);
    setError("");

    const { data, error: updateError } = await supabase
      .from("comandas")
      .update({
        status: "fechada",
        fora_dos_relatorios: true,
        taxa_servico: false,
        valor_total: 0,
        valor_taxa_servico: 0,
        fechada_at: new Date().toISOString(),
      })
      .eq("id", comanda.id)
      .select("id");

    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Não foi possível fechar essa comanda (nenhuma alteração foi salva). Tente novamente.");
      return;
    }
    await loadComandas();
  };

  if (loading) {
    return <p>Carregando comandas...</p>;
  }

  return (
    <div>
      <p>
        <Link to="/gestao/administracao">&larr; Voltar para a área de administração</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Comandas em aberto</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Feche aqui uma comanda que ficou aberta sem passar pelo pagamento (consumo da casa,
          cortesia, teste, esquecimento). Ela sai da lista de abertas e <strong>não conta</strong> no
          faturamento, na caixinha nem nos relatórios do dia. Os itens continuam no Histórico de
          pedidos.
        </p>

        {comandas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda aberta no momento.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Atendimento</th>
                <th>Aberta às</th>
                <th>Itens</th>
                <th>Total lançado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c) => {
                const itensValidos = (c.comanda_itens || []).filter((i) => i.status !== "cancelado");
                const total = itensValidos.reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0);
                return (
                  <tr key={c.id}>
                    <td>{identificarComanda(c)}</td>
                    <td>
                      {new Date(c.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{itensValidos.length}</td>
                    <td>{formatMoeda(total)}</td>
                    <td>
                      <ConfirmButton
                        disabled={busyId === c.id}
                        onConfirm={() => handleFecharSemContar(c)}
                        confirmLabel="Fechar sem contar nos relatórios"
                        style={{ padding: "6px 12px" }}
                      >
                        Fechar sem contar
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function ComandasAbertasAdmin() {
  return (
    <AdminPinGate>
      <ComandasAbertasContent />
    </AdminPinGate>
  );
}
