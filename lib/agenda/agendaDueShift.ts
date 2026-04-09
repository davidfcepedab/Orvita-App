import { formatLocalDateKey } from "@/lib/agenda/localDateKey"

/** Suma días a una fecha civil YYYY-MM-DD (zona local). */
export function addDaysToYmd(ymd: string, deltaDays: number): string {
  if (!ymd || ymd.length < 10) return formatLocalDateKey(new Date())
  const y = Number(ymd.slice(0, 4))
  const m = Number(ymd.slice(5, 7)) - 1
  const d = Number(ymd.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return formatLocalDateKey(new Date())
  }
  const dt = new Date(y, m, d + deltaDays)
  return formatLocalDateKey(dt)
}

export function isYmdTodayLocal(ymd: string): boolean {
  if (!ymd || ymd.length < 10) return false
  const today = formatLocalDateKey(new Date())
  return ymd.slice(0, 10) === today
}
