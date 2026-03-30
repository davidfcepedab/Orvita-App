/**
 * Normaliza `date` devuelta por PostgREST (tipo `date` o `timestamptz`) a `YYYY-MM-DD`
 * para comparaciones consistentes con monthBounds / filtros mensuales.
 */
export function normalizeTransactionDateIsoDay(raw: unknown): string {
  if (raw == null) return ""
  const s = String(raw).trim()
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  return m ? m[1]! : s
}
