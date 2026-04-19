"use client"

export const agendaLegendItems: { label: string; color: string }[] = [
  { label: "Personal", color: "var(--agenda-personal)" },
  { label: "Recibida (me asignaron)", color: "var(--agenda-received)" },
  { label: "Asignada (yo asigné)", color: "var(--agenda-assigned)" },
  { label: "Compartida hogar", color: "var(--agenda-shared)" },
  { label: "Calendar", color: "var(--agenda-calendar)" },
  { label: "Recordatorio", color: "var(--agenda-reminder)" },
]

type AgendaColorLegendProps = {
  /** Sin caja propia: chips en línea (barra unificada con filtros). */
  inline?: boolean
  /** Oculta la etiqueta «Leyenda» (barra única con filtros). */
  omitHeading?: boolean
  /** Solo fuentes Google en lista (evita repetir Personal / Recibida / Asignada con las pestañas). */
  sourcesOnly?: boolean
  /** Chips más pequeños (barra compacta). */
  dense?: boolean
  className?: string
}

export function AgendaColorLegend({
  inline = false,
  omitHeading = false,
  sourcesOnly = false,
  dense = false,
  className,
}: AgendaColorLegendProps) {
  const items = sourcesOnly ? agendaLegendItems.filter((i) => i.label === "Calendar" || i.label === "Recordatorio") : agendaLegendItems

  const chips = (
    <>
      {!omitHeading && (
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Leyenda
        </span>
      )}
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center text-[var(--color-text-primary)] ${dense ? "gap-1 text-[10px]" : "gap-1.5 text-[11px]"}`}
        >
          <span
            aria-hidden
            className={`shrink-0 rounded-full ${dense ? "h-1.5 w-1.5" : "h-2 w-2"}`}
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </>
  )

  if (inline) {
    return (
      <div
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className ?? ""}`}
        role="note"
        aria-label={sourcesOnly ? "Leyenda: eventos y recordatorios de Google en la lista" : "Leyenda de colores de la agenda"}
      >
        {chips}
      </div>
    )
  }

  return (
    <div
      className={className}
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
      {chips}
    </div>
  )
}
