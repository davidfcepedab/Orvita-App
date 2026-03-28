export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value || 0))
}

export function formatShortMillions(value: number) {
  const m = value / 1_000_000
  if (m >= 1) return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`
  return formatMoney(value)
}

export const arcticPanel =
  "rounded-[20px] border-[0.5px] border-slate-200/90 bg-white shadow-[0_18px_48px_-24px_rgba(15,23,42,0.18)]"
