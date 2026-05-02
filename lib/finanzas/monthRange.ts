/**
 * Inicio de rango para enlazar movimientos históricos con el catálogo de cuentas (TC/préstamos).
 * Evita cargar toda la historia; ~12 años suele bastar para saldo acumulado en Capital.
 */
export function ledgerRollupRangeStart(month: string): string {
  const [ys] = month.split("-")
  const y = Number(ys)
  if (!y) return "2015-01-01"
  return `${Math.max(2010, y - 12)}-01-01`
}

/** Suma meses civiles a `YYYY-MM` (para ventanas rolling). */
export function addCalendarMonths(ym: string, delta: number): string {
  const [ys, ms] = ym.split("-").map(Number)
  if (!ys || !ms) return ym
  const d = new Date(ys, ms - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** Últimos `n` meses civiles terminando en `anchorYm` (inclusive). Ej. n=6 → 6 meses hasta el ancla. */
export function lastNMonthsInclusive(anchorYm: string, n: number): string[] {
  const months: string[] = []
  for (let k = n - 1; k >= 0; k--) {
    months.push(addCalendarMonths(anchorYm, -k))
  }
  return months
}

/** `month` = YYYY-MM (mes civil 1–12). */
export function monthBounds(month: string) {
  const [ys, ms] = month.split("-")
  const year = Number(ys)
  const m = Number(ms)
  if (!year || !m || m < 1 || m > 12) return null
  const startStr = `${year}-${String(m).padStart(2, "0")}-01`
  const last = new Date(year, m, 0).getDate()
  const endStr = `${year}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`
  const p = m === 1 ? { py: year - 1, pm: 12 } : { py: year, pm: m - 1 }
  const pLast = new Date(p.py, p.pm, 0).getDate()
  const prevStartStr = `${p.py}-${String(p.pm).padStart(2, "0")}-01`
  const prevEndStr = `${p.py}-${String(p.pm).padStart(2, "0")}-${String(pLast).padStart(2, "0")}`
  return { startStr, endStr, prevStartStr, prevEndStr }
}
