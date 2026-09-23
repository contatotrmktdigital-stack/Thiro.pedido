import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// "Marcar pronto" já grava direto como "entregue" — o garçom não confirma entrega à parte.
const PROXIMO_STATUS = {
  pendente: "preparo",
  preparo: "entregue",
};

const LABEL_ACAO = {
  pendente: "Iniciar preparo",
  preparo: "Marcar pronto",
};

function formatHora(isoString) {
  return new Date(isoString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function labelAtendimento(comanda) {
  if (!comanda) return "";
  if (comanda.tipo === "mesa") {
    return `Mesa ${comanda.mesa_numero} · Comanda ${comanda.comandas_fisicas?.numero}`;
  }
  if (comanda.tipo === "balcao") {
    return `Balcão · ${comanda.cliente_nome}`;
  }
  return comanda.cliente_nome ? `Delivery · ${comanda.cliente_nome}` : "Delivery";
}

export default function CozinhaHome() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadItens = useCallback(async () => {
    setError("");
    // Não filtra pela comanda estar "aberta" de propósito: às vezes o cliente paga (fechando a
    // comanda) antes da cozinha terminar de preparar — o pedido tem que continuar aparecendo pra
    // cozinha até ela mesma marcar como pronto, independente da comanda já estar fechada ou não.
    const { data, error: fetchError } = await supabase
      .from("comanda_itens")
      .select(
        "id, nome_produto, quantidade, observacao, status, created_at, comandas!inner(tipo, mesa_numero, cliente_nome, comandas_fisicas(numero))"
      )
      .in("status", ["pendente", "preparo"])
      .order("created_at");

    if (fetchError) setError(fetchError.message);
    else setItens(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItens();

    const channel = supabase
      .channel("cozinha-comanda-itens")
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_itens" }, () => {
        loadItens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadItens]);

  const handleAvancar = async (item) => {
    const novoStatus = PROXIMO_STATUS[item.status];
    if (!novoStatus) return;

    setBusyId(item.id);
    setError("");
    const { error: updateError } = await supabase
      .from("comanda_itens")
      .update({ status: novoStatus })
      .eq("id", item.id);
    setBusyId(null);

    if (updateError) setError(updateError.message);
    // não precisa recarregar manualmente: o Realtime dispara loadItens() sozinho
  };

  if (loading) {
    return <p>Carregando pedidos...</p>;
  }

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Pedidos da cozinha</h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8 }}>
          Atualiza sozinho conforme o garçom lança novos itens.
        </p>

        {itens.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhum pedido pendente no momento.</p>
        ) : (
          <div className="role-grid">
            {itens.map((item) => (
              <div
                key={item.id}
                className="role-grid-item"
                style={{
                  borderColor: item.status === "preparo" ? "var(--color-blue-700)" : "var(--color-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{labelAtendimento(item.comandas)}</strong>
                  <span
                    className={`status-pill ${item.status === "preparo" ? "active" : "inactive"}`}
                  >
                    {item.status === "preparo" ? "Em preparo" : "Pendente"}
                  </span>
                </div>

                <p style={{ margin: "10px 0 4px", fontSize: "1.05rem", fontWeight: 700 }}>
                  {item.quantidade}x {item.nome_produto}
                </p>

                {item.observacao && (
                  <p
                    style={{
                      margin: "0 0 10px",
                      padding: "6px 10px",
                      background: "var(--color-red-100)",
                      color: "var(--color-red-700)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    ⚠ {item.observacao}
                  </p>
                )}

                <p style={{ margin: "0 0 12px", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                  Lançado às {formatHora(item.created_at)}
                </p>

                <button
                  className="btn-primary btn-accent"
                  disabled={busyId === item.id}
                  onClick={() => handleAvancar(item)}
                  style={{ width: "100%" }}
                >
                  {busyId === item.id ? "Atualizando..." : LABEL_ACAO[item.status]}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
