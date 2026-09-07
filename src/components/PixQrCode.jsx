import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { buildPixPayload } from "../lib/pix";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PixQrCode({ chavePix, cidade, nomeRecebedor, valor, txid }) {
  const canvasRef = useRef(null);

  const payload = chavePix
    ? buildPixPayload({ chave: chavePix, nomeRecebedor, cidade, valor, txid })
    : null;

  useEffect(() => {
    if (canvasRef.current && payload) {
      QRCode.toCanvas(canvasRef.current, payload, { width: 220, margin: 1 });
    }
  }, [payload]);

  if (!chavePix) {
    return (
      <div className="info-box">
        Chave Pix ainda não configurada. Peça pra gestão configurar em Área de administração
        &rarr; Pagamento Pix.
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: 12 }}>
      <canvas ref={canvasRef} />
      <p style={{ margin: "10px 0 0", fontWeight: 700, fontSize: "1.1rem" }}>
        {formatMoeda(valor)}
      </p>
      <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
        Peça pro cliente escanear com o app do banco dele
      </p>
    </div>
  );
}
