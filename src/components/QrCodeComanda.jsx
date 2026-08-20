import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrCodeComanda({ numero, url, restaurantName }) {
  const canvasRef = useRef(null);
  const printAreaId = `qr-print-${numero}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 220, margin: 1 });
    }
  }, [url]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="card" style={{ maxWidth: 320 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #${printAreaId}, #${printAreaId} * { visibility: visible; }
          #${printAreaId} { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <div id={printAreaId} style={{ textAlign: "center", padding: 12 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{restaurantName}</p>
        <p style={{ margin: "0 0 12px", fontSize: "1.3rem", fontWeight: 800 }}>
          Comanda {numero}
        </p>
        <canvas ref={canvasRef} />
        <p style={{ marginTop: 12, color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
          Aponte a câmera do celular pra abrir a comanda
        </p>
      </div>
      <button
        className="btn-secondary"
        style={{ width: "100%", marginTop: 8 }}
        onClick={handlePrint}
      >
        Imprimir etiqueta
      </button>
    </div>
  );
}
