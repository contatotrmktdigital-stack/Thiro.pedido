import { useState } from "react";
import PixQrCode from "./PixQrCode";
import { dividirIgualmente, lerValor, novaParte, textoValor, validarPartes } from "../lib/dinheiro";

function formatMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FORMAS = [
  { valor: "dinheiro", label: "Dinheiro" },
  { valor: "debito", label: "Cartão de débito" },
  { valor: "credito", label: "Cartão de crédito" },
  { valor: "pix", label: "Pix" },
];

// Painel do pagamento dividido: várias partes (forma + valor) que precisam somar o total.
// O pai guarda as partes; aqui só edita e mostra quanto falta.
export default function PagamentoDividido({ total, partes, onChange, restaurant, comandaId, disabled }) {
  const [quantas, setQuantas] = useState("2");
  const v = validarPartes(partes, total);

  const mudar = (id, campo, valor) =>
    onChange(partes.map((p) => (p.id === id ? { ...p, [campo]: valor, ...(campo === "forma" ? { recebido: "" } : {}) } : p)));

  const restanteSem = (id) => {
    const outras = partes.filter((p) => p.id !== id).reduce((s, p) => s + Math.round((lerValor(p.valor) || 0) * 100), 0);
    return Math.max(0, Math.round(Number(total) * 100) - outras) / 100;
  };

  const dividir = () => {
    const n = Math.min(12, Math.max(2, parseInt(quantas, 10) || 2));
    const valores = dividirIgualmente(total, n);
    onChange(valores.map((valor, i) => ({ ...(partes[i] || novaParte()), valor, recebido: "" })));
    setQuantas(String(n));
  };

  return (
    <div className="card pd" style={{ background: "var(--color-bg)" }}>
      <div className="pd-resumo">
        <span>
          Total a ser pago: <strong>{formatMoeda(total)}</strong>
        </span>
        <span className={v.falta === 0 ? "pd-ok" : "pd-falta"}>
          {v.falta === 0
            ? "Soma confere ✓"
            : v.falta > 0
              ? `Falta lançar ${formatMoeda(v.falta)}`
              : `Passou ${formatMoeda(Math.abs(v.falta))} do total`}
        </span>
      </div>

      <div className="pd-iguais">
        <label htmlFor="pd-quantas">Dividir igualmente entre</label>
        <input
          id="pd-quantas"
          type="number"
          min="2"
          max="12"
          value={quantas}
          disabled={disabled}
          onChange={(e) => setQuantas(e.target.value)}
        />
        <span>pessoas</span>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={dividir} style={{ width: "auto", padding: "6px 14px" }}>
          Dividir
        </button>
      </div>

      {partes.map((p, i) => {
        const linha = v.linhas[i];
        return (
          <div className="pd-parte" key={p.id}>
            <div className="pd-parte-topo">
              <strong>Parte {i + 1}</strong>
              {partes.length > 2 && (
                <button type="button" className="pd-remover" disabled={disabled} onClick={() => onChange(partes.filter((x) => x.id !== p.id))}>
                  Remover
                </button>
              )}
            </div>
            <div className="pd-campos">
              <select value={p.forma} disabled={disabled} onChange={(e) => mudar(p.id, "forma", e.target.value)} aria-label={`Forma da parte ${i + 1}`}>
                <option value="">Forma...</option>
                {FORMAS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Valor (R$)"
                value={p.valor}
                disabled={disabled}
                onChange={(e) => mudar(p.id, "valor", e.target.value)}
                aria-label={`Valor da parte ${i + 1}`}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={disabled}
                onClick={() => mudar(p.id, "valor", textoValor(restanteSem(p.id)))}
                style={{ width: "auto", padding: "6px 12px" }}
              >
                Restante
              </button>
            </div>

            {p.forma === "dinheiro" && (
              <div className="pd-dinheiro">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor recebido (R$)"
                  value={p.recebido}
                  disabled={disabled}
                  onChange={(e) => mudar(p.id, "recebido", e.target.value)}
                  aria-label={`Valor recebido da parte ${i + 1}`}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={disabled || !linha.valor}
                  onClick={() => mudar(p.id, "recebido", textoValor(linha.valor))}
                  style={{ width: "auto", padding: "6px 12px" }}
                >
                  Exato
                </button>
                {linha.valor_recebido !== null && (
                  <span className="pd-troco">
                    Troco: <strong>{formatMoeda(linha.troco)}</strong>
                  </span>
                )}
              </div>
            )}

            {p.forma === "pix" && linha.valor > 0 && (
              <PixQrCode
                chavePix={restaurant?.chave_pix}
                cidade={restaurant?.pix_cidade}
                nomeRecebedor={restaurant?.name}
                valor={linha.valor}
                txid={comandaId}
              />
            )}

            {linha.erro && p.valor !== "" && <p className="pd-erro">{linha.erro}</p>}
          </div>
        );
      })}

      <button
        type="button"
        className="btn-secondary"
        disabled={disabled || partes.length >= 12}
        onClick={() => onChange([...partes, novaParte()])}
        style={{ width: "auto", padding: "8px 16px" }}
      >
        + Adicionar parte
      </button>
    </div>
  );
}
