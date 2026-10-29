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

// ---------- Pagamento dividido ----------
let contadorPartes = 0;
export function novaParte(forma = "", valor = "") {
  contadorPartes += 1;
  return { id: `parte-${Date.now()}-${contadorPartes}`, forma, valor, recebido: "" };
}

export function textoValor(valor) {
  return Number(valor).toFixed(2).replace(".", ",");
}

// Valores (texto) de N partes iguais; os centavos que sobram vão para as primeiras partes.
export function dividirIgualmente(total, n) {
  const centavos = Math.round(Number(total) * 100);
  const base = Math.floor(centavos / n);
  const resto = centavos - base * n;
  return Array.from({ length: n }, (_, i) => textoValor((base + (i < resto ? 1 : 0)) / 100));
}

// Confere as partes: cada uma com forma e valor, dinheiro com valor recebido, e soma = total.
export function validarPartes(partes, total) {
  const centavosTotal = Math.round(Number(total) * 100);
  let soma = 0;
  const linhas = partes.map((p) => {
    const valor = lerValor(p.valor);
    const cents = valor === null ? 0 : Math.round(valor * 100);
    soma += cents;
    let erro = "";
    let recebido = null;
    let troco = 0;
    if (!p.forma) erro = "Escolha a forma de pagamento.";
    else if (!valor || valor <= 0) erro = "Informe o valor.";
    else if (p.forma === "dinheiro") {
      recebido = lerValor(p.recebido);
      if (recebido === null || Math.round(recebido * 100) < cents) {
        erro = "Informe o valor recebido (igual ou maior que a parte).";
        recebido = null;
      } else {
        troco = (Math.round(recebido * 100) - cents) / 100;
      }
    }
    return { forma: p.forma, valor: cents / 100, valor_recebido: recebido, troco, erro };
  });
  const falta = centavosTotal - soma;
  const ok = partes.length >= 2 && linhas.every((l) => !l.erro) && falta === 0;
  return { linhas, soma: soma / 100, falta: falta / 100, ok };
}

const ERROS_DIVIDIDO = {
  soma_diferente_do_total: "A soma das partes não é igual ao total. Confira os valores.",
  dinheiro_sem_valor_recebido: "Em dinheiro, informe o valor recebido (igual ou maior que a parte).",
  comanda_nao_esta_aberta: "Essa comanda já foi fechada.",
  minimo_duas_partes: "Para dividir, lance pelo menos 2 partes.",
};

export function mensagemErroDividido(mensagem) {
  const achada = Object.keys(ERROS_DIVIDIDO).find((k) => String(mensagem).includes(k));
  return achada ? ERROS_DIVIDIDO[achada] : "Não foi possível fechar a comanda. Nada foi salvo. Tente de novo.";
}
