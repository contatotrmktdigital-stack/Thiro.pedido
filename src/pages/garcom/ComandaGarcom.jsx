import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ConfirmButton from "../../components/ConfirmButton";
import Notinha from "../../components/Notinha";
import PixQrCode from "../../components/PixQrCode";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ComandaGarcom() {
  const { comandaId } = useParams();
  const { restaurant, profile } = useAuth();

  const [comanda, setComanda] = useState(null);
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [observacaoPendente, setObservacaoPendente] = useState("");

  const [taxaServico, setTaxaServico] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [fechando, setFechando] = useState(false);

  const loadTudo = async () => {
    setLoading(true);
    setError("");

    const [comandaResult, itensResult, categoriasResult, produtosResult] = await Promise.all([
      supabase
        .from("comandas")
        .select(
          "id, status, tipo, mesa_numero, cliente_nome, cliente_telefone, endereco_entrega, taxa_entrega, taxa_servico, forma_pagamento, valor_total, fechada_at, comandas_fisicas(numero)"
        )
        .eq("id", comandaId)
        .single(),
      supabase
        .from("comanda_itens")
        .select("id, nome_produto, preco_unitario, quantidade, produto_id, status, observacao")
        .eq("comanda_id", comandaId)
        .order("created_at"),
      supabase.from("categorias").select("id, nome").order("created_at"),
      supabase
        .from("produtos")
        .select("id, nome, preco, categoria_id, ativo")
        .eq("ativo", true)
        .order("created_at"),
    ]);

    if (comandaResult.error) setError(comandaResult.error.message);
    else if (itensResult.error) setError(itensResult.error.message);
    else if (categoriasResult.error) setError(categoriasResult.error.message);
    else if (produtosResult.error) setError(produtosResult.error.message);
    else {
      setComanda(comandaResult.data);
      setTaxaServico(comandaResult.data.taxa_servico);
      setItens(itensResult.data || []);
      setCategorias(categoriasResult.data || []);
      setProdutos(produtosResult.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTudo();

    const channel = supabase
      .channel(`comanda-${comandaId}-itens`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comanda_itens", filter: `comanda_id=eq.${comandaId}` },
        () => loadTudo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comandaId]);

  const handleAddProduto = async (produto) => {
    if (!restaurant?.id) return;

    const observacao = observacaoPendente.trim() || null;

    setBusy(true);
    setError("");

    // Só junta na mesma linha (soma quantidade) se nenhum dos dois tiver observação —
    // itens com observação diferente ficam em linhas separadas de propósito, pra cozinha
    // não perder o pedido especial de um item específico.
    const itemExistente = observacao
      ? null
      : itens.find(
          (item) => item.produto_id === produto.id && item.status === "pendente" && !item.observacao
        );

    const { error: saveError } = itemExistente
      ? await supabase
          .from("comanda_itens")
          .update({ quantidade: itemExistente.quantidade + 1 })
          .eq("id", itemExistente.id)
      : await supabase.from("comanda_itens").insert({
          restaurant_id: restaurant.id,
          comanda_id: comandaId,
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco,
          quantidade: 1,
          observacao,
        });

    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setObservacaoPendente("");
    await loadTudo();
  };

  const handleAlterarQuantidade = async (item, delta) => {
    const novaQuantidade = item.quantidade + delta;
    setBusy(true);
    setError("");

    const { error: saveError } =
      novaQuantidade <= 0
        ? await supabase.from("comanda_itens").delete().eq("id", item.id)
        : await supabase.from("comanda_itens").update({ quantidade: novaQuantidade }).eq("id", item.id);

    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    await loadTudo();
  };

  const handleMarcarEntregue = async (item) => {
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase
      .from("comanda_itens")
      .update({ status: "entregue" })
      .eq("id", item.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadTudo();
  };

  const handleCancelarItem = async (item) => {
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase
      .from("comanda_itens")
      .update({ status: "cancelado" })
      .eq("id", item.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadTudo();
  };

  const LABEL_STATUS = {
    pendente: "Pendente",
    preparo: "Em preparo",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

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
  const valorTaxaServico = taxaServico ? subtotal * 0.1 : 0;

  const handleFecharComanda = async () => {
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
        valor_taxa_servico: valorTaxaServico,
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
        <Link to="/garcom">&larr; Voltar</Link>
      </p>

      {error && <div className="error-box">{error}</div>}

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
            <h2>Delivery — {comanda.cliente_nome}</h2>
            <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
              {comanda.cliente_telefone} · {comanda.endereco_entrega}
            </p>
          </>
        )}

        {itens.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum item lançado ainda.</p>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Subtotal</th>
                <th>Status</th>
                {comanda.status === "aberta" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} style={item.status === "cancelado" ? { opacity: 0.55 } : undefined}>
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
                    <span
                      className={`status-pill ${item.status === "pronto" ? "active" : "inactive"}`}
                    >
                      {LABEL_STATUS[item.status] || item.status}
                    </span>
                  </td>
                  {comanda.status === "aberta" && (
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.status === "pendente" && (
                        <>
                          <button
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() => handleAlterarQuantidade(item, -1)}
                            style={{ width: "auto", padding: "4px 10px" }}
                          >
                            -
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() => handleAlterarQuantidade(item, 1)}
                            style={{ width: "auto", padding: "4px 10px" }}
                          >
                            +
                          </button>
                        </>
                      )}
                      {item.status === "pronto" && (
                        <button
                          className="btn-primary btn-accent"
                          disabled={busy}
                          onClick={() => handleMarcarEntregue(item)}
                          style={{ width: "auto", padding: "4px 10px" }}
                        >
                          Marcar entregue
                        </button>
                      )}
                      {["pendente", "preparo", "pronto"].includes(item.status) && (
                        <ConfirmButton
                          disabled={busy}
                          onConfirm={() => handleCancelarItem(item)}
                          style={{ padding: "4px 10px" }}
                          confirmLabel="Confirmar cancelamento"
                        >
                          Cancelar
                        </ConfirmButton>
                      )}
                      {item.status === "entregue" && profile?.role === "gestao" && (
                        <ConfirmButton
                          disabled={busy}
                          onConfirm={() => handleCancelarItem(item)}
                          style={{ padding: "4px 10px" }}
                          confirmLabel="Já foi entregue — remover mesmo assim?"
                        >
                          Remover da conta
                        </ConfirmButton>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {comanda.status === "aberta" && (
          <p style={{ textAlign: "right", fontWeight: 700, fontSize: "1.1rem", marginTop: 12 }}>
            Total: {formatMoeda(subtotal)}
          </p>
        )}
      </div>

      {comanda.status === "fechada" ? (
        <div className="card">
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: -4 }}>
            Mostre essa notinha pro cliente, ou leia os itens em voz alta.
          </p>
          <Notinha restaurantName={restaurant?.name} comanda={comanda} itens={itens} />
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Cardápio</h2>

            <div className="field">
              <label>Observação (opcional, ex: sem salada, bem passado)</label>
              <input
                value={observacaoPendente}
                onChange={(e) => setObservacaoPendente(e.target.value)}
                placeholder="Escreva aqui antes de clicar no item, se for o caso"
              />
            </div>
            {observacaoPendente.trim() && (
              <p style={{ color: "var(--color-red-700)", fontWeight: 600, fontSize: "0.85rem", marginTop: -10 }}>
                Essa observação vai ser aplicada ao próximo item que você clicar abaixo.
              </p>
            )}

            {categorias.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Nenhum item no cardápio ainda.</p>
            ) : (
              categorias.map((categoria) => {
                const produtosDaCategoria = produtos.filter((p) => p.categoria_id === categoria.id);
                if (produtosDaCategoria.length === 0) return null;
                return (
                  <div key={categoria.id} style={{ marginBottom: 18 }}>
                    <h3 style={{ color: "var(--color-blue-900)", fontSize: "0.95rem" }}>
                      {categoria.nome}
                    </h3>
                    <div className="role-grid">
                      {produtosDaCategoria.map((produto) => (
                        <button
                          key={produto.id}
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => handleAddProduto(produto)}
                          style={{ width: "100%", textAlign: "left", padding: "12px 14px" }}
                        >
                          <strong>{produto.nome}</strong>
                          <br />
                          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            {Number(produto.preco).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {itensValidos.length > 0 && (
            <div className="card">
              <h2>Fechar comanda</h2>
              <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
                Cobre o cliente e registre o pagamento aqui mesmo, na mesa.
              </p>

              <div className="field">
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
                <label>Forma de pagamento</label>
                <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Cartão de débito (na maquininha)</option>
                  <option value="credito">Cartão de crédito (na maquininha)</option>
                  <option value="pix">Pix</option>
                </select>
              </div>

              {formaPagamento === "pix" && (
                <div className="card" style={{ background: "var(--color-bg)" }}>
                  <PixQrCode
                    chavePix={restaurant?.chave_pix}
                    cidade={restaurant?.pix_cidade}
                    nomeRecebedor={restaurant?.name}
                    valor={totalPrevisto}
                    txid={comandaId}
                  />
                </div>
              )}

              <button
                className="btn-primary btn-accent"
                disabled={fechando}
                onClick={handleFecharComanda}
                style={{ width: "auto", padding: "10px 24px", marginTop: 8 }}
              >
                {fechando ? "Fechando..." : "Fechar comanda"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
