import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"

/**
 * Fechas y horas visibles en Órvita: siempre `NEXT_PUBLIC_AGENDA_DISPLAY_TZ` (ver `agendaTimeZone.ts`).
 * - Días de negocio / salud / vencimientos: `formatLocalDate*` + `localDateKeyFromIso` / `agendaTodayYmd`.
 * - Instantes reales (sync, notificaciones, auditoría): `formatInstantInAgendaTz` / `formatTimeInAgendaTz`.
 */

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
 * “Hoy” civil único para Órvita: hábitos, due de tareas, filtros de agenda, training.
 * Usa `NEXT_PUBLIC_AGENDA_DISPLAY_TZ` (no `toISOString()` UTC).
 */
export function agendaTodayYmd(): string {
  return formatLocalDateKey(new Date())
}

/**
 * YYYY-MM-DD “de calendario” si el string es solo fecha o medianoche UTC serializada (`Z` / `±00:00`).
 * Evita que `2026-04-28T00:00:00+00:00` caiga en `Date.parse` + zona de agenda y cambie el día.
 */
export function extractStoredCalendarYmd(iso: string): string | null {
  const t = iso.trim()
  if (t.length < 10) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d+)?(?:Z|[+-]00:?00)$/i)
  return m ? m[1]! : null
}

/**
 * Día civil para agrupar / comparar:
 * - `YYYY-MM-DD` solo (Tasks): no usar Date.parse (en UTC− queda el día anterior).
 * - `YYYY-MM-DDT00:00:00` + `Z` o `±00:00`: mismo día que el prefijo (timestamptz / all-day).
 * - Resto: instante → calendario local.
 */
export function localDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 10) return null
  const trimmed = iso.trim()
  const stored = extractStoredCalendarYmd(trimmed)
  if (stored) return stored

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

function civilNoonUtcFromYmd(key: string): Date | null {
  if (key.length < 10) return null
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7)) - 1
  const d = Number(key.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(Date.UTC(y, m, d, 12, 0, 0))
}

/**
 * Etiqueta es-CO para un `YYYY-MM-DD` **persistido** (bundle / all-day): calendario en `UTC` para que
 * el día mostrado coincida con la cadena en cualquier `NEXT_PUBLIC_AGENDA_DISPLAY_TZ`.
 */
export function formatStoredYmdLabelEsCo(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return "—"
  const y = Number(ymd.slice(0, 4))
  const nowY = Number(agendaTodayYmd().slice(0, 4))
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(y !== nowY ? { year: "numeric" as const } : {}),
  }).format(civilNoon)
}

function formatStoredYmdFullShortEsCo(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(civilNoon)
}

/**
 * Etiqueta legible es-CO desde ISO o YYYY-MM-DD.
 * - `YYYY-MM-DD` o `…T00:00:00.000Z`: día **almacenado** (etiqueta en UTC = dígitos del YMD).
 * - Otros ISO: instante interpretado en la zona de agenda.
 */
export function formatLocalDateLabelEsCo(isoOrYmd: string | null | undefined): string {
  if (!isoOrYmd) return "—"
  const trimmed = isoOrYmd.trim()
  const storedYmd = extractStoredCalendarYmd(trimmed)
  if (storedYmd) return formatStoredYmdLabelEsCo(storedYmd)

  const key =
    localDateKeyFromIso(isoOrYmd ?? "") ??
    (isoOrYmd.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(isoOrYmd) ? isoOrYmd.slice(0, 10) : "")
  const civilNoon = civilNoonUtcFromYmd(key)
  if (!civilNoon) return "—"
  const y = Number(key.slice(0, 4))
  const nowY = Number(agendaTodayYmd().slice(0, 4))
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(y !== nowY ? { year: "numeric" as const } : {}),
  }).format(civilNoon)
}

/** Día con año corto es-CO; mismas reglas almacenado vs instante que {@link formatLocalDateLabelEsCo}. */
export function formatLocalDateFullShortEsCo(isoOrYmd: string | null | undefined): string {
  if (!isoOrYmd) return "—"
  const trimmed = isoOrYmd.trim()
  const storedYmd = extractStoredCalendarYmd(trimmed)
  if (storedYmd) return formatStoredYmdFullShortEsCo(storedYmd)

  const key =
    localDateKeyFromIso(isoOrYmd ?? "") ??
    (isoOrYmd.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(isoOrYmd) ? isoOrYmd.slice(0, 10) : "")
  const civilNoon = civilNoonUtcFromYmd(key)
  if (!civilNoon) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(civilNoon)
}

/** «mar., 28 abr» desde `YYYY-MM-DD` almacenado (calendario UTC = dígitos del YMD). */
export function formatLocalDateWeekdayShortDayMonthEsCo(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return ymd
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(civilNoon)
}

/** Mes largo + año desde `YYYY-MM` (finanzas / PL). */
export function formatYmLongMonthYearEsCo(ym: string): string {
  const s = ym.trim().slice(0, 7)
  const [ys, ms] = s.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  const civilNoon = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0))
  if (Number.isNaN(civilNoon.getTime())) return ym
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    month: "long",
    year: "numeric",
  }).format(civilNoon)
}

/** Mes corto + año desde `YYYY-MM` (badges compactos). */
export function formatYmShortMonthYearEsCo(ym: string): string {
  const s = ym.trim().slice(0, 7)
  const [ys, ms] = s.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  const civilNoon = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0))
  if (Number.isNaN(civilNoon.getTime())) return ym
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    month: "short",
    year: "numeric",
  })
    .format(civilNoon)
    .replace(/\.$/, "")
}

/** Día de semana corto desde YYYY-MM-DD (gráficos / tablas). */
export function formatAgendaYmdWeekdayShortEsCo(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return ymd
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "short",
  }).format(civilNoon)
}

/** «02 abr» desde YYYY-MM-DD (eje X compacto). */
export function formatAgendaYmdDayMonthShortEsCo(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return ymd
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    day: "2-digit",
    month: "short",
  }).format(civilNoon)
}

/**
 * Instantáneo real (sync bancaria, Hevy, notificaciones, auditoría): fecha y hora en zona de agenda.
 * Usar para ISO con hora; no sustituye {@link formatLocalDateLabelEsCo} (días de salud / hábitos).
 */
export function formatInstantInAgendaTz(iso: string | null | undefined): string {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return String(iso)
  const tz = getAgendaDisplayTimeZone()
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: tz,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(t))
  } catch {
    return new Date(t).toISOString()
  }
}

/** Hora local en zona agenda (eventos con fecha ya resuelta aparte). */
export function formatTimeInAgendaTz(iso: string | null | undefined): string {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(t))
}

/** Fecha larga civil desde YYYY-MM-DD o ISO (todo el día / vencimientos). */
export function formatLocalDateLongEsCo(isoOrYmd: string | null | undefined): string {
  const key =
    localDateKeyFromIso(isoOrYmd ?? "") ??
    (isoOrYmd && isoOrYmd.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(isoOrYmd) ? isoOrYmd.slice(0, 10) : "")
  const civilNoon = civilNoonUtcFromYmd(key)
  if (!civilNoon) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(civilNoon)
}

/** Día de la semana largo desde YYYY-MM-DD civil. */
export function formatLocalDateWeekdayLongFromYmd(ymd: string): string {
  const civilNoon = civilNoonUtcFromYmd(ymd.slice(0, 10))
  if (!civilNoon) return ymd
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "long",
  }).format(civilNoon)
}

/** Fecha larga de un instante ISO en zona agenda (eventos con hora). */
export function formatInstantLongDateInAgendaTz(iso: string | null | undefined): string {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "—"
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getAgendaDisplayTimeZone(),
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(t))
}
