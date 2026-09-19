import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function labelComanda(comanda) {
  if (comanda.tipo === "mesa") {
    return { titulo: `Mesa ${comanda.mesa_numero}`, subtitulo: `Comanda ${comanda.comandas_fisicas?.numero}` };
  }
  if (comanda.tipo === "balcao") {
    return { titulo: "Balcão", subtitulo: comanda.cliente_nome };
  }
  return { titulo: "Delivery", subtitulo: comanda.cliente_nome };
}

function inicioDeHoje() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function CaixaHome() {
  const navigate = useNavigate();
  const [abertas, setAbertas] = useState([]);
  const [fechadasHoje, setFechadasHoje] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadComandas = async () => {
    setLoading(true);
    setError("");

    const [abertasResult, fechadasResult] = await Promise.all([
      supabase
        .from("comandas")
        .select("id, tipo, mesa_numero, cliente_nome, comandas_fisicas(numero)")
        .eq("status", "aberta")
        .order("created_at"),
      supabase
        .from("comandas")
        .select("id, tipo, mesa_numero, cliente_nome, valor_total, fechada_at, comandas_fisicas(numero)")
        .eq("status", "fechada")
        .eq("fora_dos_relatorios", false)
        .gte("fechada_at", inicioDeHoje())
        .order("fechada_at", { ascending: false }),
    ]);

    if (abertasResult.error) setError(abertasResult.error.message);
    else if (fechadasResult.error) setError(fechadasResult.error.message);
    else {
      setAbertas(abertasResult.data || []);
      setFechadasHoje(fechadasResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadComandas();
  }, []);

  if (loading) {
    return <p>Carregando comandas...</p>;
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Comandas fechadas hoje</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Já foram pagas na mesa — clique numa delas pra ver a notinha.
        </p>

        {fechadasHoje.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda fechada ainda hoje.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Atendimento</th>
                <th>Total</th>
                <th>Fechada às</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fechadasHoje.map((comanda) => {
                const { titulo, subtitulo } = labelComanda(comanda);
                return (
                  <tr key={comanda.id}>
                    <td>
                      {titulo} · {subtitulo}
                    </td>
                    <td>
                      {Number(comanda.valor_total).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td>
                      {new Date(comanda.fechada_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <button className="btn-secondary" onClick={() => navigate(`/caixa/comanda/${comanda.id}`)}>
                        Ver notinha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Comandas ainda abertas</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          O normal é fechar direto na mesa, pelo celular do garçom — isso aqui é só um resumo
          de quem ainda não fechou.
        </p>

        {abertas.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma comanda aberta no momento.</p>
        ) : (
          <div className="role-grid">
            {abertas.map((comanda) => {
              const { titulo, subtitulo } = labelComanda(comanda);
              return (
                <button
                  key={comanda.id}
                  className="btn-secondary"
                  onClick={() => navigate(`/caixa/comanda/${comanda.id}`)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    textAlign: "center",
                    fontSize: "1rem",
                    fontWeight: 700,
                  }}
                >
                  {titulo}
                  <br />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{subtitulo}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
