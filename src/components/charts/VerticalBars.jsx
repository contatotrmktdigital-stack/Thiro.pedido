const MAX_HEIGHT = 130;

export default function VerticalBars({ items, valueFormatter = (v) => v }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (items.length === 0) {
    return <p style={{ color: "var(--color-text-muted)" }}>Sem dados no período.</p>;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: 2,
        overflowX: "auto",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            flex: "1 0 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--color-text-muted)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {item.value > 0 ? valueFormatter(item.value) : ""}
          </span>
          <div
            title={`${item.label}: ${valueFormatter(item.value)}`}
            style={{
              width: "100%",
              maxWidth: 28,
              height: `${Math.max(2, (item.value / max) * MAX_HEIGHT)}px`,
              background: "var(--color-blue-700)",
              borderRadius: "4px 4px 0 0",
            }}
          />
          <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
