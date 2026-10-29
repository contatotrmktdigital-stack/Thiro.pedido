import { situacaoDinheiro } from "../lib/dinheiro";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Campo "Valor recebido" + troco em destaque (ou o que falta). Só aparece quando o pagamento é em dinheiro.
export default function ValorRecebido({ total, valor, onChange, disabled }) {
  const s = situacaoDinheiro(valor, total);
  return (
    <div className="card" style={{ background: "var(--color-bg)" }}>
      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor="valor-recebido">Valor recebido do cliente (R$)</label>
        <input
          id="valor-recebido"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 100,00"
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => onChange(String(Number(total).toFixed(2)).replace(".", ","))}
        style={{ width: "auto", padding: "6px 14px", marginBottom: 10 }}
      >
        Valor exato ({formatMoeda(total)})
      </button>

      {s.recebido !== null && s.ok && (
        <p className="troco-destaque">
          Troco: <strong>{formatMoeda(s.troco)}</strong>
        </p>
      )}
      {s.recebido !== null && !s.ok && (
        <p className="troco-destaque falta">
          Faltam <strong>{formatMoeda(s.falta)}</strong> para completar o total
        </p>
      )}
    </div>
  );
}
