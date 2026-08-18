import { useState } from "react";

export default function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Tem certeza?",
  className = "btn-secondary",
  style,
  disabled,
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button
          type="button"
          className="btn-primary btn-accent"
          disabled={disabled}
          style={{ width: "auto", padding: "4px 10px", ...style }}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ width: "auto", padding: "4px 10px" }}
          onClick={() => setConfirming(false)}
        >
          Voltar
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} style={style} onClick={() => setConfirming(true)}>
      {children}
    </button>
  );
}
