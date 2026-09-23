import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import Notinha from "../../components/Notinha";

function formatMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FechamentoCaixa() {
  const { comandaId } = useParams();
  const { restaurant } = useAuth();

  const [comanda, setComanda] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fechando, setFechando] = useState(false);

  const [taxaServico, setTaxaServico] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState("");

  const loadTudo = async () => {
    setLoading(true);
    setError("");

    const [comandaResult, itensResult] = await Promise.all([
      supabase
        .from("comandas")
        .select(
          "id, status, tipo, mesa_numero, cliente_nome, cliente_telefone, endereco_entrega, taxa_entrega, taxa_servico, forma_pagamento, valor_total, fechada_at, comandas_fisicas(numero)"
        )
        .eq("id", comandaId)
        .single(),
      supabase
        .from("comanda_itens")
        .select("id, nome_produto, preco_unitario, quantidade, observacao, status")
        .eq("comanda_id", comandaId)
        .order("created_at"),
    ]);

    if (comandaResult.error) setError(comandaResult.error.message);
    else if (itensResult.error) setError(itensResult.error.message);
    else {
      setComanda(comandaResult.data);
      setItens(itensResult.data || []);
      setTaxaServico(comandaResult.data.taxa_servico);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comandaId]);

  if (loading) {
    return <p>Carregando comanda...</p>;
  }

  if (!comanda) {
    return <div className="error-box">Comanda não encontrada.</div>;
  }

  const itensValidos = itens.filter((item) => item.status !== "cancelado");
  const subtotal = itensValidos.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0);
  const totalComTaxa = subtotal * 1.1;
  const taxaEntrega = comanda.tipo === "delivery" ? Number(comanda.taxa_entrega) || 0 : 0;
  const totalPrevisto = (taxaServico ? totalComTaxa : subtotal) + taxaEntrega;

  const handleFechar = async () => {
    if (!formaPagamento) {
      setError("Escolha a forma de pagamento.");
      return;
    }

    setFechando(true);
    setError("");

    const { error: updateError } = await supabase
      .from("comandas")
      .update({
        status: "fechada",
        taxa_servico: taxaServico,
        forma_pagamento: formaPagamento,
        valor_total: totalPrevisto,
        fechada_at: new Date().toISOString(),
      })
      .eq("id", comandaId);

    setFechando(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadTudo();
  };

  return (
    <div>
      <p>
        <Link to="/caixa">&larr; Voltar</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

      {comanda.status === "fechada" ? (
        <div className="card">
          <Notinha restaurantName={restaurant?.name} comanda={comanda} itens={itens} />
        </div>
      ) : (
        <div className="card">
          {comanda.tipo === "mesa" && (
            <>
              <h2>Mesa {comanda.mesa_numero}</h2>
              <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
                Comanda {comanda.comandas_fisicas?.numero}
              </p>
            </>
          )}
          {comanda.tipo === "balcao" && (
            <>
              <h2>Balcão</h2>
              <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>{comanda.cliente_nome}</p>
            </>
          )}
          {comanda.tipo === "delivery" && (
            <>
              <h2>Delivery{comanda.cliente_nome ? ` — ${comanda.cliente_nome}` : ""}</h2>
              {(comanda.cliente_telefone || comanda.endereco_entrega) && (
                <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
                  {[comanda.cliente_telefone, comanda.endereco_entrega].filter(Boolean).join(" · ")}
                </p>
              )}
            </>
          )}

          {itensValidos.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>Nenhum item nessa comanda.</p>
          ) : (
            <table className="table-list">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itensValidos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.nome_produto}
                      {item.observacao && (
                        <div style={{ color: "var(--color-red-700)", fontWeight: 700, fontSize: "0.8rem" }}>
                          Obs: {item.observacao}
                        </div>
                      )}
                    </td>
                    <td>{item.quantidade}</td>
                    <td>{formatMoeda(item.preco_unitario * item.quantidade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="field" style={{ marginTop: 16 }}>
            <label>
              <input
                type="checkbox"
                checked={taxaServico}
                onChange={(e) => setTaxaServico(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Cobrar taxa de serviço (10%)
            </label>
          </div>

          <p style={{ margin: "8px 0 4px" }}>
            Subtotal: <strong>{formatMoeda(subtotal)}</strong>
          </p>
          {taxaServico && (
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Com taxa de serviço: {formatMoeda(totalComTaxa)}
            </p>
          )}
          {comanda.tipo === "delivery" && (
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Taxa de entrega: {formatMoeda(taxaEntrega)}
            </p>
          )}
          <p style={{ fontWeight: 700, fontSize: "1.2rem", margin: "8px 0 16px" }}>
            Total a cobrar: {formatMoeda(totalPrevisto)}
          </p>

          <div className="field">
            <label>Forma de pagamento (cobrada separadamente na maquininha)</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="debito">Cartão de débito</option>
              <option value="credito">Cartão de crédito</option>
              <option value="pix">Pix</option>
            </select>
          </div>

          <button
            className="btn-primary btn-accent"
            disabled={fechando}
            onClick={handleFechar}
            style={{ width: "auto", padding: "10px 24px", marginTop: 8 }}
          >
            {fechando ? "Fechando..." : "Fechar comanda"}
          </button>
        </div>
      )}
    </div>
  );
}
