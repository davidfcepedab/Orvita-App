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
