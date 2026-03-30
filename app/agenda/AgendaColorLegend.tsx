"use client"

const items: { label: string; color: string }[] = [
  { label: "Personal", color: "var(--agenda-personal)" },
  { label: "Recibida (me asignaron)", color: "var(--agenda-received)" },
  { label: "Asignada (yo asigné)", color: "var(--agenda-assigned)" },
  { label: "Calendar", color: "var(--agenda-calendar)" },
  { label: "Recordatorio", color: "var(--agenda-reminder)" },
]

export function AgendaColorLegend() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px 16px",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: "12px",
        border: "0.5px solid var(--color-border)",
        background: "var(--color-surface-alt)",
      }}
    >
      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
        Leyenda
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--color-text-primary)" }}
        >
          <span
            aria-hidden
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: item.color,
              flexShrink: 0,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}
