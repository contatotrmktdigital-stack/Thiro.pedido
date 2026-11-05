import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useImpressaoConfig } from "../lib/impressao/useImpressaoConfig";
import { montarConta } from "../lib/impressao/cupom";
import { imprimirCupom } from "../lib/impressao/imprimir";

// "Imprimir conta" na impressora térmica configurada em Gestão › Impressão.
// Só aparece se o restaurante deixou ligada a opção de imprimir a conta do cliente.
export default function BotaoImprimirConta({ comanda, itens, pagamentos, style }) {
  const { restaurant } = useAuth();
  const { config } = useImpressaoConfig();
  const [imprimindo, setImprimindo] = useState(false);

  if (!config.imprimir_conta) return null;

  const imprimir = async () => {
    setImprimindo(true);
    try {
      await imprimirCupom(montarConta({ restaurante: restaurant, comanda, itens, pagamentos, config }), config, config.vias_conta);
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={imprimindo}
      onClick={imprimir}
      style={{ width: "auto", padding: "8px 16px", ...style }}
    >
      {imprimindo ? "Imprimindo..." : "🖨 Imprimir conta"}
    </button>
  );
}
