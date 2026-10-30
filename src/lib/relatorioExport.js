// Relatório para baixar (PDF e CSV). Usa os MESMOS números da tela de Relatórios.
import { totaisPorSetor } from "./setor";

const LABEL_PAGAMENTO = { dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito", pix: "Pix", dividido: "Dividido" };
const LABEL_TIPO = { mesa: "Mesa", balcao: "Balcão", delivery: "Delivery" };

const dinheiro = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const decimal = (n) => Number(n || 0).toFixed(2).replace(".", ",");
const dataBr = (iso) => iso.split("-").reverse().join("/");

function nomeComanda(c) {
  if (c.tipo === "mesa") {
    return `Mesa ${c.mesa_numero} · Comanda ${c.comandas_fisicas?.numero ?? "-"}${c.cliente_nome ? ` · ${c.cliente_nome}` : ""}`;
  }
  if (c.tipo === "balcao") return `Balcão · ${c.cliente_nome || "-"}`;
  return c.cliente_nome ? `Delivery · ${c.cliente_nome}` : "Delivery";
}

function textoPagamento(c, partes) {
  if (c.forma_pagamento === "dividido") {
    const lista = (partes || []).map((p) => `${LABEL_PAGAMENTO[p.forma] || p.forma} ${dinheiro(p.valor)}`);
    return lista.length ? lista.join(" + ") : "Dividido";
  }
  return LABEL_PAGAMENTO[c.forma_pagamento] || "-";
}

// Monta o relatório em partes (tabelas) com valores crus; PDF e CSV só formatam.
export function montarRelatorio({ restaurante, dataInicial, dataFinal, comandas, itens, partesPorComanda, porFormaPagamento }) {
  const faturamentoDe = (c) => Number(c.valor_total || 0) - Number(c.valor_taxa_servico || 0);
  const entregaDe = (c) => (c.tipo === "delivery" ? Number(c.taxa_entrega) || 0 : 0);
  // produtos = total − 10% da casa − entrega + desconto de fidelidade
  const produtosDe = (c) => Number(c.valor_total || 0) - Number(c.valor_taxa_servico || 0) - entregaDe(c) + Number(c.valor_desconto || 0);

  const faturamento = comandas.reduce((s, c) => s + faturamentoDe(c), 0);
  const dezPorCento = comandas.reduce((s, c) => s + Number(c.valor_taxa_servico || 0), 0);
  const descontos = comandas.reduce((s, c) => s + Number(c.valor_desconto || 0), 0);
  const troco = comandas.reduce((s, c) => s + Number(c.troco || 0), 0);
  const recebido = comandas.reduce((s, c) => s + Number(c.valor_total || 0), 0);

  const resumo = {
    titulo: "Resumo do período",
    colunas: [
      { nome: "Item", tipo: "texto" },
      { nome: "Valor", tipo: "texto" },
    ],
    linhas: [
      ["Faturamento (sem o 10% da casa)", dinheiro(faturamento)],
      ["Comandas fechadas", String(comandas.length)],
      ["Ticket médio", dinheiro(comandas.length ? faturamento / comandas.length : 0)],
      ["10% da casa", dinheiro(dezPorCento)],
      ["Descontos de fidelidade", dinheiro(descontos)],
      ["Total recebido (com 10% da casa)", dinheiro(recebido)],
      ["Troco dado (dinheiro)", dinheiro(troco)],
    ],
    csv: [
      ["Faturamento (sem o 10% da casa)", decimal(faturamento)],
      ["Comandas fechadas", String(comandas.length)],
      ["Ticket médio", decimal(comandas.length ? faturamento / comandas.length : 0)],
      ["10% da casa", decimal(dezPorCento)],
      ["Descontos de fidelidade", decimal(descontos)],
      ["Total recebido (com 10% da casa)", decimal(recebido)],
      ["Troco dado (dinheiro)", decimal(troco)],
    ],
  };

  const ordenadas = [...comandas].sort((a, b) => String(a.fechada_at).localeCompare(String(b.fechada_at)));
  const vendas = {
    titulo: "Vendas (uma linha por comanda)",
    colunas: [
      { nome: "Data/hora", tipo: "texto" },
      { nome: "Comanda", tipo: "texto" },
      { nome: "Tipo", tipo: "texto" },
      { nome: "Pagamento", tipo: "texto" },
      { nome: "Produtos", tipo: "dinheiro" },
      { nome: "Desconto", tipo: "dinheiro" },
      { nome: "10% da casa", tipo: "dinheiro" },
      { nome: "Entrega", tipo: "dinheiro" },
      { nome: "Total pago", tipo: "dinheiro" },
      { nome: "Troco", tipo: "dinheiro" },
    ],
    linhas: ordenadas.map((c) => [
      new Date(c.fechada_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
      nomeComanda(c),
      LABEL_TIPO[c.tipo] || c.tipo,
      textoPagamento(c, partesPorComanda[c.id]),
      produtosDe(c),
      Number(c.valor_desconto || 0),
      Number(c.valor_taxa_servico || 0),
      entregaDe(c),
      Number(c.valor_total || 0),
      Number(c.troco || 0),
    ]),
  };

  const pagamentos = {
    titulo: "Formas de pagamento (faturamento sem o 10% da casa)",
    colunas: [
      { nome: "Forma", tipo: "texto" },
      { nome: "Faturamento", tipo: "dinheiro" },
    ],
    linhas: porFormaPagamento.map((p) => [p.label, p.value]),
  };

  const porSetor = totaisPorSetor(itens);
  const produtosDoSetor = (setor) => {
    const mapa = new Map();
    for (const i of itens) {
      if ((i.setor || "outros") !== setor) continue;
      const atual = mapa.get(i.nome_produto) || { quantidade: 0, valor: 0 };
      if (!i.divisao_de) atual.quantidade += Number(i.quantidade) || 0;
      atual.valor += Number(i.preco_unitario) * (Number(i.quantidade) || 0);
      mapa.set(i.nome_produto, atual);
    }
    return [...mapa.entries()]
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .map(([nome, d]) => [nome, d.quantidade, d.valor]);
  };
  const produtos = ["cozinha", "bar", "outros"]
    .map((s) => ({
      titulo: `Produtos vendidos · ${s === "cozinha" ? "Cozinha" : s === "bar" ? "Bar" : "Outros (valor avulso)"} (${porSetor[s].quantidade} un · ${dinheiro(porSetor[s].valor)})`,
      colunas: [
        { nome: "Produto", tipo: "texto" },
        { nome: "Quantidade", tipo: "inteiro" },
        { nome: "Valor", tipo: "dinheiro" },
      ],
      linhas: produtosDoSetor(s),
    }))
    .filter((t) => t.linhas.length > 0);

  return {
    restaurante: restaurante || "Restaurante",
    periodo: dataInicial === dataFinal ? dataBr(dataInicial) : `${dataBr(dataInicial)} a ${dataBr(dataFinal)}`,
    nomeArquivo: `relatorio_${dataInicial}_a_${dataFinal}`,
    geradoEm: new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    tabelas: [resumo, vendas, pagamentos, ...produtos],
  };
}

function celulaCsv(valor) {
  const texto = String(valor ?? "");
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// CSV simples: separador ";" e vírgula nos decimais (abre direto no Excel em português).
export function gerarCsv(rel) {
  const linhas = [`${rel.restaurante}`, `Relatório de ${rel.periodo}`, `Gerado em ${rel.geradoEm}`, ""];
  for (const t of rel.tabelas) {
    linhas.push(t.titulo);
    linhas.push(t.colunas.map((c) => celulaCsv(c.nome)).join(";"));
    const origem = t.csv || t.linhas;
    for (const l of origem) {
      linhas.push(l.map((v, i) => celulaCsv(t.csv ? v : t.colunas[i].tipo === "dinheiro" ? decimal(v) : v)).join(";"));
    }
    linhas.push("");
  }
  return "﻿" + linhas.join("\r\n");
}

function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baixarCsv(rel) {
  baixarArquivo(new Blob([gerarCsv(rel)], { type: "text/csv;charset=utf-8" }), `${rel.nomeArquivo}.csv`);
}

// PDF em paisagem (a tabela de vendas tem muitas colunas). A biblioteca só é carregada quando clica.
export async function baixarPdf(rel) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margem = 32;

  doc.setFontSize(16);
  doc.text(rel.restaurante, margem, 36);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Relatório de ${rel.periodo} · gerado em ${rel.geradoEm}`, margem, 52);
  doc.setTextColor(0);

  let y = 68;
  for (const t of rel.tabelas) {
    doc.setFontSize(11);
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 40;
    }
    doc.text(t.titulo, margem, y);
    autoTable(doc, {
      startY: y + 6,
      head: [t.colunas.map((c) => c.nome)],
      body: t.linhas.map((l) => l.map((v, i) => (t.colunas[i].tipo === "dinheiro" ? dinheiro(v) : String(v)))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [11, 37, 89] },
      columnStyles: Object.fromEntries(
        t.colunas.map((c, i) => [i, { halign: c.tipo === "dinheiro" || c.tipo === "inteiro" ? "right" : "left" }])
      ),
      margin: { left: margem, right: margem },
    });
    y = doc.lastAutoTable.finalY + 22;
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${p} de ${total}`, doc.internal.pageSize.getWidth() - margem - 60, doc.internal.pageSize.getHeight() - 16);
  }

  doc.save(`${rel.nomeArquivo}.pdf`);
}
