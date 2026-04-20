/**
 * Operaciones sobre fechas civiles YYYY-MM-DD (Gregoriano) alineadas con hábitos y agenda.
 * Sin depender de la zona horaria del proceso: suma/resta vía Temporal; diferencia vía UTC date parts.
 */

type TemporalNs = {
  PlainDate: { from(s: string): { add(o: { days: number }): { toString(): string } } }
}

function temporalPlainDate(): TemporalNs | undefined {
  return (globalThis as Record<string, unknown>).Temporal as TemporalNs | undefined
}

/** Suma días al calendario civil (misma semántica que hábitos / `addDaysIso` legacy). */
export function addCalendarDaysYmd(ymd: string, delta: number): string {
  const key = ymd.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const d = new Date(`${ymd}T12:00:00.000Z`)
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
  }
  const T = temporalPlainDate()
  if (T?.PlainDate) {
    try {
      return T.PlainDate.from(key).add({ days: delta }).toString()
    } catch {
      // fallback
    }
  }
  const d = new Date(`${key}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/**
 * Días de calendario de `fromYmd` a `toYmd` (to − from).
 * Ej.: from=lun, to=mar → +2; mismo día → 0.
 */
export function diffCalendarDaysYmd(fromYmd: string, toYmd: string): number {
  const a = fromYmd.slice(0, 10)
  const b = toYmd.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return 0
  const [y1, m1, d1] = a.split("-").map(Number)
  const [y2, m2, d2] = b.split("-").map(Number)
  const t0 = Date.UTC(y1, m1 - 1, d1)
  const t1 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t1 - t0) / 86400000)
}

/** Suma meses a `YYYY-MM` (primer día del mes en calendario gregoriano UTC). */
export function addCalendarMonthsYm(ym: string, deltaMonths: number): string {
  const s = ym.trim().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(s)) return s
  const [y, m] = s.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return s
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1, 12, 0, 0))
  if (Number.isNaN(d.getTime())) return s
  const yy = d.getUTCFullYear()
  const mm = d.getUTCMonth() + 1
  return `${yy}-${String(mm).padStart(2, "0")}`
}
