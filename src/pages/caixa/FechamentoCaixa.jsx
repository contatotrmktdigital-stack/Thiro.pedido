import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import Notinha from "../../components/Notinha";
import { calcularFechamento } from "../../lib/fechamento";
import ValorRecebido from "../../components/ValorRecebido";
import PagamentoDividido from "../../components/PagamentoDividido";
import { mensagemErroDividido, novaParte, situacaoDinheiro, validarPartes } from "../../lib/dinheiro";

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
  const [valorRecebido, setValorRecebido] = useState("");
  const [dividindo, setDividindo] = useState(false);
  const [partes, setPartes] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const loadTudo = async () => {
    setLoading(true);
    setError("");

    const [comandaResult, itensResult] = await Promise.all([
      supabase
        .from("comandas")
        .select(
          "id, status, tipo, mesa_numero, cliente_nome, cliente_telefone, endereco_entrega, taxa_entrega, taxa_servico, desconto_pct, valor_desconto, forma_pagamento, valor_total, fechada_at, comandas_fisicas(numero)"
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

  // Pagamento dividido já fechado: busca as partes pra mostrar na notinha.
  useEffect(() => {
    if (comanda?.status !== "fechada" || comanda?.forma_pagamento !== "dividido") {
      setPagamentos([]);
      return;
    }
    supabase
      .from("comanda_pagamentos")
      .select("forma, valor, valor_recebido, troco")
      .eq("comanda_id", comandaId)
      .order("created_at")
      .then(({ data }) => setPagamentos(data || []));
  }, [comanda?.status, comanda?.forma_pagamento, comandaId]);

  if (loading) {
    return <p>Carregando comanda...</p>;
  }

  if (!comanda) {
    return <div className="error-box">Comanda não encontrada.</div>;
  }

  const itensValidos = itens.filter((item) => item.status !== "cancelado");
  const subtotal = itensValidos.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0);
  const fechamento = calcularFechamento({
    subtotal,
    dezPorCentoDaCasa: taxaServico,
    descontoPct: comanda.status === "fechada" ? 0 : comanda.desconto_pct,
    taxaEntrega: comanda.tipo === "delivery" ? Number(comanda.taxa_entrega) || 0 : 0,
  });
  const { desconto: valorDesconto, taxaEntrega } = fechamento;
  const totalPrevisto = fechamento.total;
  const dinheiro = formaPagamento === "dinheiro";
  const sd = situacaoDinheiro(valorRecebido, totalPrevisto);
  const vp = dividindo ? validarPartes(partes, totalPrevisto) : null;

  const alternarTaxaServico = async (ligado) => {
    setTaxaServico(ligado);
    if (comanda.status !== "aberta") return;
    const { data, error: updateError } = await supabase
      .from("comandas")
      .update({ taxa_servico: ligado })
      .eq("id", comandaId)
      .select("id");
    if (updateError || !data || data.length === 0) {
      setTaxaServico(!ligado);
      setError("Não foi possível atualizar o 10% da casa. Tente de novo.");
    }
  };

  const handleFechar = async () => {
    if (dividindo) {
      if (!vp.ok) {
        setError("Confira as partes: cada uma precisa de forma e valor, e a soma tem de ser igual ao total.");
        return;
      }
      setFechando(true);
      setError("");
      const { error: rpcError } = await supabase.rpc("fechar_comanda_dividida", {
        p_comanda_id: comandaId,
        p_taxa_servico: taxaServico,
        p_valor_desconto: valorDesconto,
        p_valor_taxa_servico: fechamento.dezPorCento,
        p_valor_total: totalPrevisto,
        p_partes: vp.linhas.map((l) => ({ forma: l.forma, valor: l.valor, valor_recebido: l.valor_recebido })),
      });
      setFechando(false);
      if (rpcError) {
        setError(mensagemErroDividido(rpcError.message));
        return;
      }
      setDividindo(false);
      setPartes([]);
      await loadTudo();
      return;
    }

    if (!formaPagamento) {
      setError("Escolha a forma de pagamento.");
      return;
    }
    if (dinheiro && !sd.ok) {
      setError("Informe o valor recebido em dinheiro (igual ou maior que o total).");
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
        valor_recebido: dinheiro ? sd.recebido : null,
        troco: dinheiro ? sd.troco : null,
        valor_desconto: valorDesconto,
        valor_taxa_servico: fechamento.dezPorCento,
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
          <Notinha restaurantName={restaurant?.name} comanda={comanda} itens={itens} pagamentos={pagamentos} />
        </div>
      ) : (
        <div className="card">
          {comanda.tipo === "mesa" && (
            <>
              <h2>Mesa {comanda.mesa_numero}</h2>
              <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
                Comanda {comanda.comandas_fisicas?.numero}
                {comanda.cliente_nome ? ` · ${comanda.cliente_nome}` : ""}
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
                onChange={(e) => alternarTaxaServico(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Cobrar 10% da casa
            </label>
          </div>

          <p style={{ margin: "8px 0 4px" }}>
            Total da compra: <strong>{formatMoeda(subtotal)}</strong>
          </p>
          {valorDesconto > 0 && (
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Desconto de fidelidade ({Number(comanda.desconto_pct)}% nos produtos): −{formatMoeda(valorDesconto)}
            </p>
          )}
          {taxaServico && (
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              10% da casa: +{formatMoeda(fechamento.dezPorCento)}
            </p>
          )}
          {comanda.tipo === "delivery" && (
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              Taxa de entrega: {formatMoeda(taxaEntrega)}
            </p>
          )}
          <p style={{ fontWeight: 700, fontSize: "1.2rem", margin: "8px 0 16px" }}>
            {taxaServico ? "Total a ser pago" : "Total a ser pago sem 10%"}: {formatMoeda(totalPrevisto)}
          </p>

          {!dividindo && (
          <>
          <div className="field">
            <label>Forma de pagamento (cobrada separadamente na maquininha)</label>
            <select
              value={formaPagamento}
              onChange={(e) => {
                setFormaPagamento(e.target.value);
                setValorRecebido("");
              }}
            >
              <option value="">Selecione...</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="debito">Cartão de débito</option>
              <option value="credito">Cartão de crédito</option>
              <option value="pix">Pix</option>
            </select>
          </div>

          {dinheiro && <ValorRecebido total={totalPrevisto} valor={valorRecebido} onChange={setValorRecebido} />}

          <button
            type="button"
            className="fid-link"
            onClick={() => {
              setDividindo(true);
              setPartes([novaParte(), novaParte()]);
              setFormaPagamento("");
              setValorRecebido("");
            }}
          >
            Dividir pagamento
          </button>
          </>
          )}

          {dividindo && (
            <>
              <PagamentoDividido
                total={totalPrevisto}
                partes={partes}
                onChange={setPartes}
                restaurant={restaurant}
                comandaId={comandaId}
                disabled={fechando}
              />
              <button
                type="button"
                className="fid-link"
                onClick={() => {
                  setDividindo(false);
                  setPartes([]);
                }}
              >
                Voltar para pagamento único
              </button>
            </>
          )}

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
