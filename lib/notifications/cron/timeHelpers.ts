/** Hora local 0–23 en `timeZone` (IANA). */
export function localHourInTimezone(timeZone: string, d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const h = parts.find((p) => p.type === "hour")?.value
  const n = h != null ? Number(h) : NaN
  return Number.isFinite(n) ? n : 0
}

/** YYYY-MM-DD calendario en `timeZone`. */
export function localYmdInTimezone(timeZone: string, d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

const LONG_WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

/** Día de la semana local 0=dom … 6=sáb */
export function localWeekdayInTimezone(timeZone: string, d = new Date()): number {
  const str = d.toLocaleString("en-US", { timeZone, weekday: "long" })
  const idx = LONG_WD.indexOf(str as (typeof LONG_WD)[number])
  return idx >= 0 ? idx : d.getUTCDay()
}

/**
 * Si hora local está en ventana silenciosa. Soporta cruce de medianoche (ej. 22→7).
 */
export function isInQuietHours(
  localHour: number,
  start: number | null,
  end: number | null,
): boolean {
  if (start == null || end == null) return false
  if (start === end) return false
  if (start < end) {
    return localHour >= start && localHour < end
  }
  return localHour >= start || localHour < end
}
