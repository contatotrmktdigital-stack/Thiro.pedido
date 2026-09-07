// Monta o payload do QR code Pix ("Copia e Cola"), no formato oficial do
// Banco Central (EMV/BR Code). É só um texto formatado em campos
// id+tamanho+valor, terminando com uma soma de verificação (CRC16) — não
// depende de nenhum serviço externo, é matemática pura em cima de um
// padrão público.

const DIACRITIC_RANGE_START = 0x0300;
const DIACRITIC_RANGE_END = 0x036f;

function semAcentoMaiusculo(texto) {
  return Array.from((texto || "").normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < DIACRITIC_RANGE_START || code > DIACRITIC_RANGE_END;
    })
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "");
}

function tlv(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

function crc16ccitt(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Formata a chave Pix certo pra cada tipo — em especial telefone, que
// precisa do código do país (+55) na frente pro banco reconhecer. Sem
// isso, bancos acusam "chave inexistente" mesmo com o número certo.
export function formatarChavePix(tipo, valorDigitado) {
  const valor = (valorDigitado || "").trim();
  if (tipo === "cpf" || tipo === "cnpj") {
    return valor.replace(/\D/g, "");
  }
  if (tipo === "telefone") {
    const digitos = valor.replace(/\D/g, "");
    const semCodigoPais = digitos.startsWith("55") && digitos.length > 11 ? digitos.slice(2) : digitos;
    return `+55${semCodigoPais}`;
  }
  return valor;
}

// txid: identificador opcional (só letras/números, até 25 caracteres) —
// aparece no comprovante do cliente e ajuda a conferir depois qual
// comanda gerou aquele Pix. "***" é o padrão do Banco Central quando não
// há identificador.
export function buildPixPayload({ chave, nomeRecebedor, cidade, valor, txid }) {
  const nome = semAcentoMaiusculo(nomeRecebedor).slice(0, 25) || "RECEBEDOR";
  const cidadeFormatada = semAcentoMaiusculo(cidade).slice(0, 15) || "BRASIL";
  const txidFormatado = (txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const merchantAccountInfo = tlv("00", "br.gov.bcb.pix") + tlv("01", chave.trim());

  let payload = "";
  payload += tlv("00", "01");
  payload += tlv("26", merchantAccountInfo);
  payload += tlv("52", "0000");
  payload += tlv("53", "986");
  if (valor > 0) {
    payload += tlv("54", Number(valor).toFixed(2));
  }
  payload += tlv("58", "BR");
  payload += tlv("59", nome);
  payload += tlv("60", cidadeFormatada);
  payload += tlv("62", tlv("05", txidFormatado));
  payload += "6304";

  return payload + crc16ccitt(payload);
}
