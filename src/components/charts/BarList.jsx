export default function BarList({ items, valueFormatter = (v) => v, colorFor }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return <p style={{ color: "var(--color-text-muted)" }}>Sem dados no período.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--color-text)" }}>{item.label}</span>
            <span
              style={{
                color: "var(--color-text)",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {valueFormatter(item.value)}
            </span>
          </div>
          <div style={{ background: "var(--color-border)", borderRadius: 4, height: 10 }}>
            <div
              style={{
                width: `${(item.value / max) * 100}%`,
                height: "100%",
                background: colorFor ? colorFor(item) : "var(--color-blue-700)",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
