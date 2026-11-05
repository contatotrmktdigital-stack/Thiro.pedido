// Impressão comum (qualquer impressora instalada no aparelho): monta o cupom em HTML no tamanho do rolo
// e manda para a impressão do navegador, dentro de um quadro invisível.
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function blocoHtml(b) {
  const grande = b.grande ? " grande" : "";
  const neg = b.neg ? " neg" : "";
  if (b.t === "sep") return '<div class="sep"></div>';
  if (b.t === "espaco") return '<div class="espaco"></div>';
  if (b.t === "lr") {
    return `<div class="lr${grande}${neg}"><span class="e">${esc(b.esq)}</span><span class="d">${esc(b.dir)}</span></div>`;
  }
  const alinhar = b.align === "centro" ? " centro" : b.align === "dir" ? " dir" : "";
  return `<div class="tx${alinhar}${grande}${neg}">${esc(b.txt)}</div>`;
}

// config: largura_papel_mm, area_impressao_mm, colunas, tamanho_letra
export function blocosParaHtml(blocos, config, vias = 1) {
  const area = Number(config.area_impressao_mm) || 72;
  const papel = Number(config.largura_papel_mm) || 80;
  const colunas = Number(config.colunas) || 48;
  const escala = (Number(config.tamanho_letra) || 100) / 100;
  // largura de cada caractere = área / colunas; em fonte monoespaçada isso é ~0,6 do tamanho da letra
  const pt = (area / colunas / 0.6) * 2.835 * escala;
  const um = blocos.map(blocoHtml).join("");
  const copias = Array.from({ length: Math.max(1, vias) }, (_, i) => `<div class="via${i > 0 ? " quebra" : ""}">${um}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Cupom</title><style>
@page { size: ${papel}mm auto; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { width: ${area}mm; margin: 0 auto; padding: 2mm 0; font-family: "Courier New", Courier, monospace; font-size: ${pt.toFixed(2)}pt; line-height: 1.25; color: #000; }
.tx { white-space: pre-wrap; word-break: break-word; }
.centro { text-align: center; } .dir { text-align: right; }
.neg { font-weight: bold; } .grande { font-size: 1.35em; }
.lr { display: flex; justify-content: space-between; gap: 1ch; }
.lr .e { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.lr .d { flex: 0 0 auto; white-space: nowrap; text-align: right; }
.sep { border-top: 1px dashed #000; margin: 1.2mm 0; }
.espaco { height: 3mm; }
.via { padding-bottom: 8mm; }
.quebra { break-before: page; page-break-before: always; }
</style></head><body>${copias}</body></html>`;
}

export function imprimirHtml(html) {
  return new Promise((resolve) => {
    const quadro = document.createElement("iframe");
    quadro.setAttribute("aria-hidden", "true");
    quadro.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(quadro);
    const doc = quadro.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    // dá um instante para o quadro montar antes de imprimir
    setTimeout(() => {
      try {
        quadro.contentWindow.focus();
        quadro.contentWindow.print();
      } finally {
        resolve();
        setTimeout(() => quadro.remove(), 60000);
      }
    }, 250);
  });
}

export function imprimirCupom(blocos, config, vias = 1) {
  return imprimirHtml(blocosParaHtml(blocos, config, vias));
}
