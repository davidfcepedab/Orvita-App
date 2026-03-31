import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"

/** Ancla un día del mes (1–31) al mes civil `YYYY-MM` (respeta fin de mes). */
export function daysInMonthYm(ym: string): number {
  const [ys, ms] = ym.split("-").map(Number)
  if (!ys || !ms) return 31
  return new Date(ys, ms, 0).getDate()
}

export function clampDayToMonth(ym: string, day: number): number {
  const dim = daysInMonthYm(ym)
  const d = Math.round(Number(day))
  if (!Number.isFinite(d)) return 1
  return Math.min(Math.max(1, d), dim)
}

export function isoDateInMonth(ym: string, day: number): string {
  const d = clampDayToMonth(ym, day)
  return `${ym}-${String(d).padStart(2, "0")}`
}

/** Día del mes (1–31) en calendario local; no usar solo slice(0,10) si el ISO trae zona UTC. */
export function dayFromIso(iso: string): number {
  const key = localDateKeyFromIso(iso) ?? (iso.length >= 10 ? iso.slice(0, 10) : "")
  const da = Number(key.slice(8, 10))
  return Number.isFinite(da) && da >= 1 ? da : 1
}
