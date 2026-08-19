function hexToHsl(hex) {
  const clean = (hex || "").replace("#", "").trim();
  let r, g, b;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Recebe a cor escolhida pelo restaurante e devolve as variações usadas pelo
// app (cabeçalho, botões, destaques, fundo claro), sempre com contraste
// seguro para o texto branco por cima — independente da cor escolhida.
export function buildRestaurantThemeVars(hex) {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const { h } = hsl;
  const s = Math.max(hsl.s, 35);

  return {
    "--color-blue-900": hslToHex(h, s, 22),
    "--color-blue-700": hslToHex(h, s, 38),
    "--color-blue-600": hslToHex(h, s, 48),
    "--color-blue-100": hslToHex(h, Math.min(s, 55), 92),
  };
}

export const DEFAULT_COR_PRIMARIA = "#1d4ed8";
