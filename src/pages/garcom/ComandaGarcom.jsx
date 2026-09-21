import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ConfirmButton from "../../components/ConfirmButton";
import Notinha from "../../components/Notinha";
import PixQrCode from "../../components/PixQrCode";
import { emojiDaCategoria } from "../../lib/categoriaEmoji";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const LABEL_PAGAMENTO = {
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  pix: "Pix",
};

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
  const [buscaProduto, setBuscaProduto] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [produtoParaObservacao, setProdutoParaObservacao] = useState(null);
  const [observacaoModal, setObservacaoModal] = useState("");

  const [taxaServico, setTaxaServico] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [fechando, setFechando] = useState(false);
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [valorAvulso, setValorAvulso] = useState("");
  const [descricaoAvulso, setDescricaoAvulso] = useState("");
  const [lancandoAvulso, setLancandoAvulso] = useState(false);
  const [itemParaRemover, setItemParaRemover] = useState(null);
  const [senhaRemocao, setSenhaRemocao] = useState("");
  const [erroSenhaRemocao, setErroSenhaRemocao] = useState("");
  const [verificandoSenha, setVerificandoSenha] = useState(false);

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
      setCategoriaSelecionada((atual) => atual ?? categoriasResult.data?.[0]?.id ?? null);
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

  // Clicar num item do cardápio abre um pop-up perguntando a observação (opcional). Só depois
  // de confirmar ali é que o item entra na lista local "a enviar" — nada é gravado ainda, e a
  // cozinha não vê nada até o garçom clicar em "Enviar para a cozinha".
  const handleAddProduto = (produto) => {
    setProdutoParaObservacao(produto);
    setObservacaoModal("");
  };

  const handleConfirmarAdicionarAoCarrinho = () => {
    const produto = produtoParaObservacao;
    if (!produto) return;
    const observacao = observacaoModal.trim() || null;

    setCarrinho((atual) => {
      // Só junta na mesma linha (soma quantidade) se nenhum dos dois tiver observação —
      // itens com observação diferente ficam em linhas separadas de propósito, pra cozinha
      // não perder o pedido especial de um item específico.
      if (!observacao) {
        const indice = atual.findIndex((linha) => linha.produto_id === produto.id && !linha.observacao);
        if (indice >= 0) {
          const copia = [...atual];
          copia[indice] = { ...copia[indice], quantidade: copia[indice].quantidade + 1 };
          return copia;
        }
      }
      return [
        ...atual,
        {
          chave: `${produto.id}-${Date.now()}-${Math.random()}`,
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco,
          quantidade: 1,
          observacao,
        },
      ];
    });
    setProdutoParaObservacao(null);
    setObservacaoModal("");
  };

  const handleAlterarQuantidadeCarrinho = (chave, delta) => {
    setCarrinho((atual) =>
      atual
        .map((linha) => (linha.chave === chave ? { ...linha, quantidade: linha.quantidade + delta } : linha))
        .filter((linha) => linha.quantidade > 0)
    );
  };

  const handleEnviarParaCozinha = async () => {
    if (!restaurant?.id || carrinho.length === 0) return;

    setEnviando(true);
    setError("");

    const { error: insertError } = await supabase.from("comanda_itens").insert(
      carrinho.map((linha) => ({
        restaurant_id: restaurant.id,
        comanda_id: comandaId,
        produto_id: linha.produto_id,
        nome_produto: linha.nome_produto,
        preco_unitario: linha.preco_unitario,
        quantidade: linha.quantidade,
        observacao: linha.observacao,
      }))
    );

    setEnviando(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCarrinho([]);
    await loadTudo();
  };

  const handleLancarValorAvulso = async () => {
    const valor = Math.round(Number(String(valorAvulso).replace(",", ".")) * 100) / 100;
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Informe um valor avulso maior que zero.");
      return;
    }

    setLancandoAvulso(true);
    setError("");

    // Entra já como "entregue" pra não aparecer na fila da cozinha (não tem preparo).
    const { error: insertError } = await supabase.from("comanda_itens").insert({
      restaurant_id: restaurant.id,
      comanda_id: comandaId,
      produto_id: null,
      nome_produto: "Valor avulso",
      preco_unitario: valor,
      quantidade: 1,
      observacao: descricaoAvulso.trim() || null,
      status: "entregue",
    });

    setLancandoAvulso(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setValorAvulso("");
    setDescricaoAvulso("");
    setConfirmandoPagamento(false);
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

  const handleConfirmarRemocaoComSenha = async (e) => {
    e.preventDefault();
    if (!restaurant?.admin_pin_hash) {
      setErroSenhaRemocao("A gestão ainda não criou a senha de administração.");
      return;
    }

    setVerificandoSenha(true);
    setErroSenhaRemocao("");
    const { data: senhaOk, error: rpcError } = await supabase.rpc("verify_admin_pin", {
      p_restaurant_id: restaurant.id,
      p_pin: senhaRemocao,
    });
    setVerificandoSenha(false);

    if (rpcError) {
      setErroSenhaRemocao(rpcError.message);
      return;
    }
    if (!senhaOk) {
      setErroSenhaRemocao("Senha da gestão incorreta.");
      setSenhaRemocao("");
      return;
    }

    const item = itemParaRemover;
    setItemParaRemover(null);
    setSenhaRemocao("");
    await handleCancelarItem(item);
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

    const { data: fechada, error: updateError } = await supabase
      .from("comandas")
      .update({
        status: "fechada",
        taxa_servico: taxaServico,
        forma_pagamento: formaPagamento,
        valor_total: totalPrevisto,
        valor_taxa_servico: valorTaxaServico,
        fechada_at: new Date().toISOString(),
      })
      .eq("id", comandaId)
      .select("id");

    setFechando(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!fechada || fechada.length === 0) {
      setError(
        "Não foi possível confirmar o fechamento (nenhuma alteração foi salva). Tente novamente e, se continuar, avise o suporte."
      );
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
                      className={`status-pill ${["pronto", "entregue"].includes(item.status) ? "active" : "inactive"}`}
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
                      {["pendente", "preparo"].includes(item.status) && (
                        <ConfirmButton
                          disabled={busy}
                          onConfirm={() => handleCancelarItem(item)}
                          style={{ padding: "4px 10px" }}
                          confirmLabel="Confirmar cancelamento"
                        >
                          Cancelar
                        </ConfirmButton>
                      )}
                      {["pronto", "entregue"].includes(item.status) &&
                        (profile?.role === "gestao" || item.nome_produto === "Valor avulso" ? (
                          <ConfirmButton
                            disabled={busy}
                            onConfirm={() => handleCancelarItem(item)}
                            style={{ padding: "4px 10px" }}
                            confirmLabel={
                              item.nome_produto === "Valor avulso"
                                ? "Remover valor avulso?"
                                : "Já foi entregue — remover mesmo assim?"
                            }
                          >
                            Remover da conta
                          </ConfirmButton>
                        ) : (
                          <button
                            className="btn-secondary"
                            disabled={busy}
                            onClick={() => {
                              setItemParaRemover(item);
                              setSenhaRemocao("");
                              setErroSenhaRemocao("");
                            }}
                            style={{ padding: "4px 10px" }}
                          >
                            Remover da conta
                          </button>
                        ))}
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

      {itemParaRemover && (
        <div className="modal-backdrop" onClick={() => setItemParaRemover(null)}>
          <form
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmarRemocaoComSenha}
          >
            <h2 style={{ marginTop: 0 }}>Remover da conta</h2>
            <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
              {itemParaRemover.quantidade}x {itemParaRemover.nome_produto} já foi feito pela cozinha.
              Peça a senha da gestão para remover.
            </p>
            {erroSenhaRemocao && <div className="error-box">{erroSenhaRemocao}</div>}
            <div className="field">
              <label>Senha da gestão</label>
              <input
                type="password"
                inputMode="numeric"
                value={senhaRemocao}
                onChange={(e) => setSenhaRemocao(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                className="btn-primary btn-accent"
                type="submit"
                disabled={verificandoSenha}
                style={{ width: "auto", padding: "10px 18px" }}
              >
                {verificandoSenha ? "Verificando..." : "Remover da conta"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setItemParaRemover(null)}
                style={{ width: "auto", padding: "10px 18px" }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

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
              <label>Buscar produto</label>
              <input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Digite o nome do item (ex: coca, x-bacon...)"
              />
            </div>

            {categorias.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Nenhum item no cardápio ainda.</p>
            ) : buscaProduto.trim() ? (
              (() => {
                const encontrados = produtos.filter((p) =>
                  p.nome.toLowerCase().includes(buscaProduto.trim().toLowerCase())
                );
                return encontrados.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)" }}>
                    Nenhum produto encontrado com "{buscaProduto}".
                  </p>
                ) : (
                  <div className="role-grid">
                    {encontrados.map((produto) => (
                      <button
                        key={produto.id}
                        className="btn-secondary"
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
                );
              })()
            ) : (
              <div className="cardapio-layout">
                <div className="categoria-sidebar">
                  {categorias.map((categoria) => {
                    const quantidade = produtos.filter((p) => p.categoria_id === categoria.id).length;
                    return (
                      <button
                        key={categoria.id}
                        type="button"
                        className={`categoria-sidebar-item${categoriaSelecionada === categoria.id ? " ativa" : ""}`}
                        onClick={() => setCategoriaSelecionada(categoria.id)}
                      >
                        <span className="categoria-emoji">{emojiDaCategoria(categoria.nome)}</span>
                        <span>{categoria.nome}</span>
                        <span className="categoria-contagem">{quantidade} {quantidade === 1 ? "item" : "itens"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="produtos-area">
                  {produtos.filter((p) => p.categoria_id === categoriaSelecionada).length === 0 ? (
                    <p style={{ color: "var(--color-text-muted)" }}>Nenhum item nessa categoria.</p>
                  ) : (
                    <div className="role-grid">
                      {produtos
                        .filter((p) => p.categoria_id === categoriaSelecionada)
                        .map((produto) => (
                          <button
                            key={produto.id}
                            className="btn-secondary"
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
                  )}
                </div>
              </div>
            )}
          </div>

          {produtoParaObservacao && (
            <div className="modal-backdrop" onClick={() => setProdutoParaObservacao(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginTop: 0 }}>{produtoParaObservacao.nome}</h2>
                <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
                  {formatMoeda(produtoParaObservacao.preco)}
                </p>
                <div className="field">
                  <label>Observação (opcional)</label>
                  <input
                    value={observacaoModal}
                    onChange={(e) => setObservacaoModal(e.target.value)}
                    placeholder="Ex: sem salada, bem passado"
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    className="btn-primary btn-accent"
                    onClick={handleConfirmarAdicionarAoCarrinho}
                    style={{ width: "auto", padding: "10px 18px" }}
                  >
                    Confirmar e adicionar ao carrinho
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setProdutoParaObservacao(null)}
                    style={{ width: "auto", padding: "10px 18px" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Itens a enviar {carrinho.length > 0 ? `(${carrinho.length})` : ""}</h2>
            <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
              Nada disso vai pra cozinha até você clicar em "Enviar para a cozinha".
            </p>

            {carrinho.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Nenhum item selecionado ainda.</p>
            ) : (
              <>
                <table className="table-list">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd.</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.map((linha) => (
                      <tr key={linha.chave}>
                        <td>
                          {linha.nome_produto}
                          {linha.observacao && (
                            <div style={{ color: "var(--color-red-700)", fontWeight: 700, fontSize: "0.8rem" }}>
                              Obs: {linha.observacao}
                            </div>
                          )}
                        </td>
                        <td>{linha.quantidade}</td>
                        <td>{formatMoeda(linha.preco_unitario * linha.quantidade)}</td>
                        <td style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn-secondary"
                            onClick={() => handleAlterarQuantidadeCarrinho(linha.chave, -1)}
                            style={{ width: "auto", padding: "4px 10px" }}
                          >
                            -
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleAlterarQuantidadeCarrinho(linha.chave, 1)}
                            style={{ width: "auto", padding: "4px 10px" }}
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ textAlign: "right", fontWeight: 700, margin: "10px 0" }}>
                  Subtotal a enviar:{" "}
                  {formatMoeda(carrinho.reduce((soma, l) => soma + l.preco_unitario * l.quantidade, 0))}
                </p>
                <button
                  className="btn-primary btn-accent"
                  disabled={enviando}
                  onClick={handleEnviarParaCozinha}
                  style={{ width: "auto", padding: "10px 20px" }}
                >
                  {enviando ? "Enviando..." : "Enviar para a cozinha"}
                </button>
              </>
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
                <select
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    setConfirmandoPagamento(false);
                  }}
                >
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

              {confirmandoPagamento ? (
                <div className="card" style={{ background: "var(--color-red-100)" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.9rem" }}>
                    Confira antes de fechar — forma de pagamento selecionada:
                  </p>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontSize: "1.3rem",
                      fontWeight: 800,
                      color: "var(--color-red-700)",
                    }}
                  >
                    {LABEL_PAGAMENTO[formaPagamento]}
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="btn-primary btn-accent"
                      disabled={fechando}
                      onClick={handleFecharComanda}
                      style={{ width: "auto", padding: "10px 20px" }}
                    >
                      {fechando ? "Fechando..." : "Confirmar pagamento"}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={fechando}
                      onClick={() => setConfirmandoPagamento(false)}
                      style={{ width: "auto", padding: "10px 20px" }}
                    >
                      Trocar forma de pagamento
                    </button>
                  </div>
                </div>
              ) : carrinho.length > 0 ? (
                <p style={{ color: "var(--color-red-700)", fontWeight: 600 }}>
                  Tem {carrinho.length} item(ns) ainda não enviado(s) pra cozinha. Envie antes de
                  fechar a comanda.
                </p>
              ) : (
                <button
                  className="btn-primary btn-accent"
                  disabled={fechando}
                  onClick={() => {
                    if (!formaPagamento) {
                      setError("Escolha a forma de pagamento.");
                      return;
                    }
                    setError("");
                    setConfirmandoPagamento(true);
                  }}
                  style={{ width: "auto", padding: "10px 24px", marginTop: 8 }}
                >
                  Fechar comanda
                </button>
              )}

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>Valor avulso</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "0 0 10px" }}>
                  Soma um valor manual na conta (não vai pra cozinha).
                </p>
                <div className="inline-form" style={{ marginBottom: 0 }}>
                  <div className="field">
                    <label>Valor (R$)</label>
                    <input
                      value={valorAvulso}
                      onChange={(e) => setValorAvulso(e.target.value)}
                      placeholder="Ex: 12,50"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="field">
                    <label>Descrição (opcional)</label>
                    <input
                      value={descricaoAvulso}
                      onChange={(e) => setDescricaoAvulso(e.target.value)}
                      placeholder="Ex: item fora do cardápio"
                    />
                  </div>
                  <button
                    className="btn-primary"
                    disabled={lancandoAvulso || fechando}
                    onClick={handleLancarValorAvulso}
                    style={{ width: "auto", padding: "10px 18px" }}
                  >
                    {lancandoAvulso ? "Adicionando..." : "Adicionar à conta"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
