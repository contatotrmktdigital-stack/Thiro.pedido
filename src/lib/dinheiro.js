// "50", "50,5", "50.50", "R$ 1.050,00" -> número (ou null se vazio/inválido)
export function lerValor(texto) {
  const limpo = String(texto ?? "")
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// Situação do pagamento em dinheiro: quanto veio, troco ou quanto falta.
export function situacaoDinheiro(texto, total) {
  const recebido = lerValor(texto);
  const centavosTotal = Math.round(Number(total) * 100);
  if (recebido === null) return { recebido: null, troco: 0, falta: 0, ok: false };
  const centavosRecebido = Math.round(recebido * 100);
  const ok = centavosRecebido >= centavosTotal;
  return {
    recebido,
    troco: ok ? (centavosRecebido - centavosTotal) / 100 : 0,
    falta: ok ? 0 : (centavosTotal - centavosRecebido) / 100,
    ok,
  };
}
