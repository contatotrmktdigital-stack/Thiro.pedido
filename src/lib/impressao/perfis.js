// Perfis de impressora térmica. Cada perfil já traz o papel e quantos caracteres cabem por linha.
//
// Fonte dos números do Epson TM-T20X: especificação da Epson — papel de 80 mm, área de impressão de
// 72 mm, 48 colunas (letra normal) / 64 (letra pequena), tabela de acentos PC860 (português) = código 3 no
// comando ESC t. Os perfis "Genérica" seguem o padrão do mercado: 80 mm → 72 mm úteis → 48 colunas;
// 58 mm → 48 mm úteis → 32 colunas. Outros modelos entram aqui quando a especificação for confirmada.
export const PERFIS = [
  {
    id: "epson-tm-t20x",
    nome: "Epson TM-T20X (M352A)",
    larguraPapelMm: 80,
    areaImpressaoMm: 72,
    colunas: 48,
    codepage: 3,
  },
  { id: "generica-80", nome: "Genérica 80 mm", larguraPapelMm: 80, areaImpressaoMm: 72, colunas: 48, codepage: 3 },
  { id: "generica-58", nome: "Genérica 58 mm", larguraPapelMm: 58, areaImpressaoMm: 48, colunas: 32, codepage: 3 },
  { id: "personalizada", nome: "Personalizada (eu defino)", larguraPapelMm: 80, areaImpressaoMm: 72, colunas: 48, codepage: 3 },
];

export const CONFIG_PADRAO = {
  modelo: "generica-80",
  largura_papel_mm: 80,
  area_impressao_mm: 72,
  colunas: 48,
  tamanho_letra: 100,
  codepage: 3,
  metodo: "navegador",
  cabecalho: "",
  rodape: "Obrigado pela preferência!",
  imprimir_conta: true,
  conta_ao_fechar: false,
  vias_conta: 1,
  imprimir_cozinha: false,
  imprimir_bar: false,
  vias_pedido: 1,
};

export function perfilPorId(id) {
  return PERFIS.find((p) => p.id === id) || PERFIS[1];
}

// Aplica um perfil nos campos de papel da configuração (o resto fica como está).
export function aplicarPerfil(config, id) {
  const p = perfilPorId(id);
  if (p.id === "personalizada") return { ...config, modelo: id };
  return {
    ...config,
    modelo: id,
    largura_papel_mm: p.larguraPapelMm,
    area_impressao_mm: p.areaImpressaoMm,
    colunas: p.colunas,
    codepage: p.codepage,
  };
}
