import type { CSSProperties } from "react"

/**
 * Estilos compartidos Recharts alineados con tokens Arctic Zen (additive).
 */
export const rechartsTooltipContentStyle: CSSProperties = {
  borderRadius: 10,
  border: "0.5px solid var(--color-border)",
  fontSize: 12,
  background: "color-mix(in srgb, var(--color-surface) 96%, transparent)",
  boxShadow: "var(--shadow-card)",
}

export const rechartsDefaultMargin = { top: 12, right: 6, left: 4, bottom: 8 } as const
