// Tenta adivinhar um emoji pra categoria com base no nome, só pra deixar o
// menu lateral mais visual — se não reconhecer nada, usa um prato genérico.
const REGRAS = [
  [/hamb[uú]rg|burger|lanche|sandu[ií]che/i, "🍔"],
  [/pizza/i, "🍕"],
  [/fritas|batata|por[cç][aã]o|aperitivo|petisco|entrada/i, "🍟"],
  [/pastel|salgad/i, "🥟"],
  [/sobremesa|doce|sorvete|gelato/i, "🍰"],
  [/bebida|suco|refrigerante|[aá]gua/i, "🥤"],
  [/cerveja|chopp/i, "🍺"],
  [/vinho/i, "🍷"],
  [/drink|coquetel|dose|whisky|vodka|cacha[cç]a/i, "🍹"],
  [/limonada/i, "🍋"],
  [/caf[eé]/i, "☕"],
  [/frango|chicken/i, "🍗"],
  [/carne|churrasco|espeto/i, "🥩"],
  [/peixe|frutos do mar|camar[aã]o/i, "🐟"],
  [/massa|macarr[aã]o|lasanha/i, "🍝"],
  [/salada|vegetariano|vegano/i, "🥗"],
  [/adicional|extra|acompanhamento/i, "➕"],
  [/taxa|op[cç][aã]o|servi[cç]o/i, "💳"],
];

export function emojiDaCategoria(nome) {
  const encontrada = REGRAS.find(([regex]) => regex.test(nome || ""));
  return encontrada ? encontrada[1] : "🍽️";
}
