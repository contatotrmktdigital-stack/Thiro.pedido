const LABEL_PAGAMENTO = {
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  pix: "Pix",
};

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Notinha({ restaurantName, comanda, itens }) {
  const itensValidos = itens.filter((item) => item.status !== "cancelado");
  const subtotal = itensValidos.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0);
  const taxaEntrega = comanda.tipo === "delivery" ? Number(comanda.taxa_entrega) || 0 : 0;

  let atendimento = "";
  if (comanda.tipo === "mesa") {
    atendimento = `Mesa ${comanda.mesa_numero} · Comanda ${comanda.comandas_fisicas?.numero ?? ""}`;
  } else if (comanda.tipo === "balcao") {
    atendimento = `Balcão · ${comanda.cliente_nome}`;
  } else {
    atendimento = `Delivery · ${comanda.cliente_nome}`;
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: 16,
        boxShadow: "var(--shadow)",
        maxWidth: 380,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(90deg, var(--color-blue-900), var(--color-blue-700))",
          color: "white",
          padding: "22px 24px 18px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--color-red-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "1.1rem",
            margin: "0 auto 10px",
          }}
        >
          ✓
        </div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{restaurantName || "Thiro.pedido"}</p>
        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.85 }}>{atendimento}</p>
      </div>

      <div
        style={{
          height: 10,
          backgroundImage:
            "radial-gradient(circle at 8px 0, transparent 8px, var(--color-bg) 8.5px)",
          backgroundSize: "16px 16px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "top",
        }}
      />

      <div style={{ padding: "20px 24px" }}>
        {itensValidos.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>Nenhum item.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {itensValidos.map((item) => (
              <div key={item.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span>
                    {item.quantidade}x {item.nome_produto}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {formatMoeda(item.preco_unitario * item.quantidade)}
                  </span>
                </div>
                {item.observacao && (
                  <div style={{ color: "var(--color-red-700)", fontSize: "0.78rem", fontWeight: 600 }}>
                    Obs: {item.observacao}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            <span>Subtotal</span>
            <span>{formatMoeda(subtotal)}</span>
          </div>
          {comanda.taxa_servico && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              <span>Taxa de serviço (10%)</span>
              <span>{formatMoeda(subtotal * 0.1)}</span>
            </div>
          )}
          {taxaEntrega > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              <span>Taxa de entrega</span>
              <span>{formatMoeda(taxaEntrega)}</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 14,
            paddingTop: 14,
            borderTop: "2px solid var(--color-blue-900)",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--color-blue-900)" }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--color-blue-900)" }}>
            {formatMoeda(comanda.valor_total ?? subtotal)}
          </span>
        </div>

        {comanda.forma_pagamento && (
          <p style={{ textAlign: "center", marginTop: 10, marginBottom: 0, fontSize: "0.85rem" }}>
            Pago em <strong>{LABEL_PAGAMENTO[comanda.forma_pagamento] || comanda.forma_pagamento}</strong>
          </p>
        )}

        {comanda.fechada_at && (
          <p style={{ textAlign: "center", marginTop: 4, marginBottom: 0, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {new Date(comanda.fechada_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
      </div>

      <div
        style={{
          height: 10,
          backgroundImage:
            "radial-gradient(circle at 8px 10px, transparent 8px, var(--color-bg) 8.5px)",
          backgroundSize: "16px 16px",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "bottom",
        }}
      />

      <p
        style={{
          textAlign: "center",
          padding: "10px 24px 18px",
          margin: 0,
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
        }}
      >
        Obrigado pela preferência! 🍔
      </p>
    </div>
  );
}
