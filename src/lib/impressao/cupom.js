// Cupom em "blocos" neutros. Os mesmos blocos viram HTML (impressão comum pelo navegador) e,
// numa próxima etapa, comandos ESC/POS (impressão direta) — assim os dois saem iguais.
//
// Tipos de bloco:
//   { t: "texto", txt, align: "esq"|"centro"|"dir", neg?: boolean, grande?: boolean }
//   { t: "lr", esq, dir, neg?: boolean, grande?: boolean }   // esquerda e direita na mesma linha
//   { t: "sep" }                                              // linha tracejada
//   { t: "espaco" }                                           // linha em branco
const dinheiro = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const LABEL_PAGAMENTO = {
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  pix: "Pix",
  dividido: "Pagamento dividido",
};

function atendimento(c) {
  if (!c) return "";
  if (c.tipo === "mesa") {
    return `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? ""}${c.cliente_nome ? ` · ${c.cliente_nome}` : ""}`;
  }
  if (c.tipo === "balcao") return `Balcão · ${c.cliente_nome || ""}`;
  return c.cliente_nome ? `Delivery · ${c.cliente_nome}` : "Delivery";
}

function dataHora(iso) {
  return new Date(iso || Date.now()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const texto = (txt, extra = {}) => ({ t: "texto", txt, align: "esq", ...extra });
const centro = (txt, extra = {}) => texto(txt, { align: "centro", ...extra });
const lr = (esq, dir, extra = {}) => ({ t: "lr", esq, dir, ...extra });
const SEP = { t: "sep" };
const ESPACO = { t: "espaco" };

function linhasDoTexto(valor) {
  return String(valor || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ---------------- Conta do cliente (no fechamento)
export function montarConta({ restaurante, comanda, itens, pagamentos, config }) {
  const validos = (itens || []).filter((i) => i.status !== "cancelado");
  const subtotal = validos.reduce((s, i) => s + Number(i.preco_unitario) * Number(i.quantidade), 0);
  const desconto = Number(comanda.valor_desconto) || 0;
  const dezPorCento = comanda.taxa_servico ? Math.round((subtotal - desconto) * 10) / 100 : 0;
  const entrega = comanda.tipo === "delivery" ? Number(comanda.taxa_entrega) || 0 : 0;
  const total = comanda.valor_total ?? subtotal + dezPorCento + entrega - desconto;

  const b = [];
  b.push(centro(restaurante?.name || "Restaurante", { neg: true, grande: true }));
  linhasDoTexto(config?.cabecalho).forEach((l) => b.push(centro(l)));
  b.push(SEP);
  b.push(texto(atendimento(comanda), { neg: true }));
  b.push(texto(dataHora(comanda.fechada_at)));
  b.push(SEP);

  validos.forEach((i) => {
    b.push(lr(`${i.quantidade}x ${i.nome_produto}`, dinheiro(Number(i.preco_unitario) * Number(i.quantidade))));
    if (i.observacao) b.push(texto(`  Obs: ${i.observacao}`, { neg: true }));
  });
  if (validos.length === 0) b.push(centro("Nenhum item."));

  b.push(SEP);
  b.push(lr("Total da compra", dinheiro(subtotal)));
  if (desconto > 0) b.push(lr("Desconto de fidelidade", `-${dinheiro(desconto)}`));
  if (comanda.taxa_servico) b.push(lr("10% da casa", `+${dinheiro(dezPorCento)}`));
  if (entrega > 0) b.push(lr("Taxa de entrega", `+${dinheiro(entrega)}`));
  b.push(SEP);
  b.push(lr("Total a ser pago", dinheiro(total), { neg: true, grande: true }));

  if (comanda.forma_pagamento === "dividido" && pagamentos?.length) {
    b.push(ESPACO);
    b.push(texto("Pagamento dividido:", { neg: true }));
    pagamentos.forEach((p) => {
      b.push(lr(LABEL_PAGAMENTO[p.forma] || p.forma, dinheiro(p.valor)));
      if (p.forma === "dinheiro" && p.valor_recebido != null) {
        b.push(texto(`  recebido ${dinheiro(p.valor_recebido)} · troco ${dinheiro(p.troco)}`));
      }
    });
  } else if (comanda.forma_pagamento) {
    b.push(ESPACO);
    b.push(centro(`Pago em ${LABEL_PAGAMENTO[comanda.forma_pagamento] || comanda.forma_pagamento}`));
    if (comanda.forma_pagamento === "dinheiro" && comanda.valor_recebido != null) {
      b.push(lr("Recebido", dinheiro(comanda.valor_recebido)));
      b.push(lr("Troco", dinheiro(comanda.troco)));
    }
  }

  const rodape = linhasDoTexto(config?.rodape);
  if (rodape.length) {
    b.push(ESPACO);
    rodape.forEach((l) => b.push(centro(l)));
  }
  return b;
}

// ---------------- Pedido para a cozinha ou o bar
export function montarPedido({ restaurante, setor, comanda, itens, config }) {
  const titulo = setor === "bar" ? "PEDIDO · BAR" : "PEDIDO · COZINHA";
  const b = [];
  b.push(centro(titulo, { neg: true, grande: true }));
  b.push(centro(restaurante?.name || "", {}));
  b.push(SEP);
  b.push(texto(atendimento(comanda), { neg: true, grande: true }));
  b.push(texto(dataHora(), {}));
  b.push(SEP);
  (itens || []).forEach((i) => {
    b.push(texto(`${i.quantidade}x ${i.nome_produto}`, { neg: true, grande: true }));
    if (i.observacao) b.push(texto(`  >> ${i.observacao}`, { neg: true }));
  });
  b.push(ESPACO);
  void config;
  return b;
}

// ---------------- Cupom de teste (confere papel, colunas e acentos)
export function montarTeste({ restaurante, config }) {
  const cols = Number(config?.colunas) || 48;
  const regua = Array.from({ length: cols }, (_, i) => String((i + 1) % 10)).join("");
  const comanda = {
    tipo: "mesa",
    mesa_numero: 5,
    comandas_fisicas: { numero: 7 },
    cliente_nome: "Cliente Teste",
    taxa_servico: true,
    valor_desconto: 0,
    valor_total: 49.5,
    forma_pagamento: "dinheiro",
    valor_recebido: 100,
    troco: 50.5,
    fechada_at: new Date().toISOString(),
  };
  const itens = [
    { quantidade: 2, nome_produto: "X-Bacon", preco_unitario: 20, status: "entregue", observacao: "sem cebola" },
    { quantidade: 1, nome_produto: "Refrigerante lata", preco_unitario: 5, status: "entregue" },
  ];
  return [
    centro("TESTE DE IMPRESSÃO", { neg: true, grande: true }),
    texto(regua),
    texto(`${cols} colunas · ${config?.largura_papel_mm || 80} mm`),
    texto("Acentos: ação, coração, é, ú, ç, Ç, ñ, ü"),
    SEP,
    ...montarConta({ restaurante, comanda, itens, config }),
    ESPACO,
    texto(regua),
  ];
}
