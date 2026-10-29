// Setor que prepara o produto. Serve para separar relatórios e histórico (a fila da cozinha é uma só).
export const LABEL_SETOR = { cozinha: "Cozinha", bar: "Bar" };

// Sugestão a partir do nome da categoria: Bebidas, Drinks e Doses vão para o Bar; o resto, Cozinha.
export function sugerirSetor(nomeCategoria) {
  return /(bebida|drink|dose)/i.test(nomeCategoria || "") ? "bar" : "cozinha";
}

// Soma dos itens (não cancelados) por setor. "outros" = itens sem produto (valor avulso).
export function totaisPorSetor(itens) {
  const totais = {
    cozinha: { quantidade: 0, valor: 0 },
    bar: { quantidade: 0, valor: 0 },
    outros: { quantidade: 0, valor: 0 },
  };
  for (const i of itens) {
    if (i.status === "cancelado") continue;
    const chave = i.setor === "bar" || i.setor === "cozinha" ? i.setor : "outros";
    totais[chave].quantidade += Number(i.quantidade) || 0;
    totais[chave].valor += Number(i.preco_unitario) * (Number(i.quantidade) || 0);
  }
  return totais;
}
