import { addDaysToYmd } from "@/lib/agenda/agendaDueShift"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"

export type UnifiedListHorizonId = "today" | "tomorrow" | "this_week" | "next_week" | "this_month"

/** Días extra tras el fin de mes cuando el usuario amplía con «+». */
export const UNIFIED_LIST_EXTENDED_DAYS_AFTER_MONTH = 45

const US_WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Día de la semana (domingo=0 … sábado=6) del civil `YYYY-MM-DD` en la zona de agenda. */
function sun0WeekdayIndexForAgendaYmd(ymd: string): number {
  const key = ymd.trim().slice(0, 10)
  const [y, m, d] = key.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0
  const inst = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const tz = getAgendaDisplayTimeZone()
  const short = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(inst)
  const idx = US_WEEKDAY_SHORT.indexOf(short as (typeof US_WEEKDAY_SHORT)[number])
  return idx >= 0 ? idx : 0
}

/** Lunes=0 … domingo=6 (rejilla Lun–Dom), para el civil `YYYY-MM-DD` en la zona de agenda. */
export function weekdayMonday0ForAgendaYmd(ymd: string): number {
  return (sun0WeekdayIndexForAgendaYmd(ymd) + 6) % 7
}

/** Lunes civil de la semana que contiene `ymd` (lunes–domingo), en la zona de agenda. */
export function mondayOfCalendarWeekContainingYmd(ymd: string): string {
  const key = ymd.trim().slice(0, 10)
  const day = sun0WeekdayIndexForAgendaYmd(key)
  const delta = day === 0 ? -6 : 1 - day
  return addDaysToYmd(key, delta)
}

function endOfCalendarMonthYmd(ymd: string): string {
  const key = ymd.trim().slice(0, 10)
  const [y, m] = key.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return agendaTodayYmd()
  const lastDay = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

export type HorizonRange = { start: string; end: string }

/**
 * Rango inclusive [start, end] en YYYY-MM-DD (civil local vía `agendaTodayYmd` + sumas locales).
 * `extendedAfterMonth` solo aplica a `this_month`: extiende el fin tras el último día del mes.
 */
export function unifiedListHorizonRange(
  id: UnifiedListHorizonId,
  opts: { extendedAfterMonth: boolean },
): HorizonRange {
  const t = agendaTodayYmd()
  if (id === "today") return { start: t, end: t }
  if (id === "tomorrow") {
    const tm = addDaysToYmd(t, 1)
    return { start: tm, end: tm }
  }
  const mon = mondayOfCalendarWeekContainingYmd(t)
  const sun = addDaysToYmd(mon, 6)
  if (id === "this_week") return { start: t, end: sun }
  const monNext = addDaysToYmd(sun, 1)
  const sunNext = addDaysToYmd(monNext, 6)
  if (id === "next_week") return { start: monNext, end: sunNext }
  const endM = endOfCalendarMonthYmd(t)
  let end = endM
  if (id === "this_month" && opts.extendedAfterMonth) {
    end = addDaysToYmd(endM, UNIFIED_LIST_EXTENDED_DAYS_AFTER_MONTH)
  }
  return { start: t, end }
}

export function ymdLexInRange(k: string, start: string, end: string): boolean {
  return k >= start && k <= end
}

/** Títulos de bloque para separadores visuales (cronología unificada). */
export function unifiedTimelineSectionTitle(dayKey: string | null, todayYmd: string): string {
  if (!dayKey || dayKey === "__sin_fecha__") return "Sin día en calendario"
  const tz = getAgendaDisplayTimeZone()
  const [y, m, d] = dayKey.split("-").map(Number)
  const civilNoonUtc =
    Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
      ? new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      : null
  const fmt = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: tz,
  })
  const longDay =
    civilNoonUtc && !Number.isNaN(civilNoonUtc.getTime())
      ? (() => {
          try {
            return fmt.format(civilNoonUtc)
          } catch {
            return dayKey
          }
        })()
      : dayKey

  if (dayKey === todayYmd) return `Hoy · ${longDay}`
  const tom = addDaysToYmd(todayYmd, 1)
  if (dayKey === tom) return `Mañana · ${longDay}`

  const mon = mondayOfCalendarWeekContainingYmd(todayYmd)
  const sun = addDaysToYmd(mon, 6)
  if (dayKey >= mon && dayKey <= sun && dayKey > tom) {
    return `Esta semana · ${longDay}`
  }
  const monN = addDaysToYmd(sun, 1)
  const sunN = addDaysToYmd(monN, 6)
  if (dayKey >= monN && dayKey <= sunN) return `Próxima semana · ${longDay}`

  const [yt, mt] = todayYmd.split("-").map(Number)
  const [yk, mk] = dayKey.split("-").map(Number)
  if (yk === yt && mk === mt) return `Este mes · ${longDay}`

  return `Más adelante · ${longDay}`
}

export function unifiedRowInHorizon(
  dayKey: string | null,
  horizon: UnifiedListHorizonId,
  extendedAfterMonth: boolean,
): boolean {
  const { start, end } = unifiedListHorizonRange(horizon, { extendedAfterMonth })
  if (dayKey == null || dayKey === "__sin_fecha__") {
    return horizon !== "today" && horizon !== "tomorrow"
  }
  return ymdLexInRange(dayKey, start, end)
}
