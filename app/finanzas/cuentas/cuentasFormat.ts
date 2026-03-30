export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value || 0))
}

export function formatShortMillions(value: number) {
  const m = value / 1_000_000
  if (m >= 1) return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`
  return formatMoney(value)
}

export const arcticPanel =
  "rounded-[var(--radius-card)] border-[0.5px] border-orbita-border/90 bg-orbita-surface shadow-card"
