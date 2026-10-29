// Conta do fechamento (uma só, usada pelo garçom, caixa, notinha e tela do cliente):
//   produtos − desconto de fidelidade → "10% da casa" sobre o valor JÁ com desconto → + taxa de entrega.
// Exemplo: R$ 50,00 − 10% (R$ 5,00) = R$ 45,00 → 10% da casa = R$ 4,50 → total R$ 49,50.
const arredonda = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function calcularFechamento({ subtotal, dezPorCentoDaCasa = false, descontoPct = 0, taxaEntrega = 0 }) {
  const produtos = arredonda(subtotal);
  const desconto = arredonda((produtos * Number(descontoPct || 0)) / 100);
  const base = arredonda(produtos - desconto);
  const dezPorCento = dezPorCentoDaCasa ? arredonda(base * 0.1) : 0;
  const entrega = arredonda(taxaEntrega);
  return {
    subtotal: produtos,
    desconto,
    base,
    dezPorCento,
    taxaEntrega: entrega,
    total: arredonda(base + dezPorCento + entrega),
  };
}
