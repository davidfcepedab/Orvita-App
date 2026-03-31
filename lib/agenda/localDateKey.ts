import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"

/** YYYY-MM-DD del instante `d` en la zona de agenda (p. ej. America/Bogota). */
export function formatLocalDateKey(d: Date): string {
  const tz = getAgendaDisplayTimeZone()
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * Día civil para agrupar / comparar:
 * - `YYYY-MM-DD` solo (Tasks): no usar Date.parse (en UTC− queda el día anterior).
 * - `YYYY-MM-DDT00:00:00.000Z`: mismo día que el prefijo (eventos all-day normalizados así en API).
 * - Resto: instante → calendario local.
 */
export function localDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 10) return null
  const trimmed = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const utcMidnight = trimmed.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?Z$/i)
  if (utcMidnight) return utcMidnight[1]!

  const t = Date.parse(trimmed)
  if (Number.isNaN(t)) return null
  return formatLocalDateKey(new Date(t))
}

/** Día de inicio del evento para índices y filtros (all-day vs con hora). */
export function calendarEventLocalDayKey(ev: {
  startAt: string | null
  allDay: boolean
}): string | null {
  if (!ev.startAt || ev.startAt.length < 10) return null
  return localDateKeyFromIso(ev.startAt) ?? ev.startAt.slice(0, 10)
}

/**
 * Etiqueta legible es-CO desde ISO completo o YYYY-MM-DD (siempre día civil local).
 */
export function formatLocalDateLabelEsCo(isoOrYmd: string | null | undefined): string {
  const key =
    localDateKeyFromIso(isoOrYmd ?? "") ??
    (isoOrYmd && isoOrYmd.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(isoOrYmd) ? isoOrYmd.slice(0, 10) : "")
  if (key.length < 10) return "—"
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7)) - 1
  const d = Number(key.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "—"
  const nowY = Number(formatLocalDateKey(new Date()).slice(0, 4))
  const civilNoon = new Date(Date.UTC(y, m, d, 12, 0, 0))
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(y !== nowY ? { year: "numeric" as const } : {}),
  }).format(civilNoon)
}
