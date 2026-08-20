// Funcionarios (garcom, cozinha, caixa e logins extras de gestao) entram com
// um NOME DE USUARIO em vez de e-mail -- evita a gestao ter que inventar um
// e-mail pra cada pessoa da equipe. Por baixo dos panos o Supabase Auth
// ainda exige um e-mail, entao geramos um "e-mail" interno que nunca e
// mostrado nem usado pra enviar nada -- so serve como identificador tecnico.
export const STAFF_EMAIL_DOMAIN = "equipe.thiropedido.app";

const DIACRITIC_RANGE_START = 0x0300;
const DIACRITIC_RANGE_END = 0x036f;

export function slugifyUsername(text) {
  const semAcento = Array.from((text || "").normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < DIACRITIC_RANGE_START || code > DIACRITIC_RANGE_END;
    })
    .join("");

  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// Login.jsx aceita tanto um e-mail de verdade (gestao/super admin, que ja
// tinham conta antes dessa mudanca) quanto um nome de usuario de funcionario.
export function toLoginEmail(identifier) {
  const trimmed = (identifier || "").trim();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@${STAFF_EMAIL_DOMAIN}`;
}
