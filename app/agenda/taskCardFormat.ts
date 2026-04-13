import { diffCalendarDaysYmd } from "@/lib/agenda/calendarMath"
import { agendaTodayYmd, formatLocalDateLabelEsCo, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

/** Segunda línea estándar: siempre prefijo `Vence:`. `dueDateKey` es YYYY-MM-DD como fecha civil local. */
export function venceLine(dueDateKey: string): string {
  if (!dueDateKey || dueDateKey.length < 10) return "Vence: sin fecha"
  const y = Number(dueDateKey.slice(0, 4))
  const mo = Number(dueDateKey.slice(5, 7)) - 1
  const d = Number(dueDateKey.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "Vence: sin fecha"
  const today = agendaTodayYmd()
  const key = dueDateKey.slice(0, 10)
  const diffDays = diffCalendarDaysYmd(today, key)
  const civil = formatLocalDateLabelEsCo(dueDateKey)

  if (diffDays === 0) return `Vence: Hoy · ${civil}`
  if (diffDays === 1) return `Vence: Mañana · ${civil}`
  if (diffDays === -1) return `Vence: Ayer · ${civil}`
  if (diffDays < -1) return `Vence: Atrasada · ${civil}`

  const target = new Date(y, mo, d)
  const weekday = target.toLocaleDateString("es-CO", { weekday: "long" })
  if (diffDays <= 7) return `Vence: el ${weekday} · ${civil}`
  return `Vence: el ${weekday} (próx. semana) · ${civil}`
}

/** Meta corta arriba a la izquierda (sin prefijo «Vence:»). */
export function dueMetaCompact(dueDateKey: string): string {
  if (!dueDateKey || dueDateKey.length < 10) return "Sin fecha"
  const y = Number(dueDateKey.slice(0, 4))
  const mo = Number(dueDateKey.slice(5, 7)) - 1
  const d = Number(dueDateKey.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "Sin fecha"
  const today = agendaTodayYmd()
  const key = dueDateKey.slice(0, 10)
  const diffDays = diffCalendarDaysYmd(today, key)
  const civil = formatLocalDateLabelEsCo(dueDateKey)

  if (diffDays === 0) return `Hoy · ${civil}`
  if (diffDays === 1) return `Mañana · ${civil}`
  if (diffDays === -1) return `Ayer · ${civil}`
  if (diffDays < -1) return `Atrasada · ${civil}`

  const target = new Date(y, mo, d)
  const weekday = target.toLocaleDateString("es-CO", { weekday: "long" })
  if (diffDays <= 7) return `${weekday} · ${civil}`
  return `${weekday} (próx. sem.) · ${civil}`
}

/** Meta compacta para eventos (día local + horario breve si aplica). */
export function calendarEventMetaCompact(ev: GoogleCalendarEventDTO): string {
  if (!ev.startAt) return "Sin fecha"
  const k = localDateKeyFromIso(ev.startAt) ?? ev.startAt.slice(0, 10)
  if (k.length < 10) return "Sin fecha"
  if (ev.allDay) return dueMetaCompact(k)
  const start = new Date(ev.startAt)
  if (Number.isNaN(start.getTime())) return dueMetaCompact(k)
  const tf = start.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${dueMetaCompact(k)} · ${tf}`
}

export function formatPriorityTitle(p: UiAgendaTask["priority"]): string {
  if (p === "alta") return "Alta"
  if (p === "baja") return "Baja"
  return "Media"
}

export function formatStatusTitle(status: string): string {
  if (!status.trim()) return "—"
  return status
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

/** Solo horas (sin fecha); preferir `calendarEventUnifiedTimeline` en tarjetas. */
export function calendarEventScheduleLine(ev: GoogleCalendarEventDTO): string {
  if (ev.allDay) return "Todo el día"
  if (!ev.startAt) return "Sin horario"
  const start = new Date(ev.startAt)
  if (Number.isNaN(start.getTime())) return "Sin horario"
  const tf = (dt: Date) =>
    dt.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
  if (ev.endAt) {
    const end = new Date(ev.endAt)
    if (!Number.isNaN(end.getTime())) return `${tf(start)} – ${tf(end)}`
  }
  return `${tf(start)}`
}

/**
 * Una sola línea: fecha civil local + horario (evita duplicar con "| Vence:" y corrige lectura vs UTC).
 * Ej.: "lunes, 6 de abril de 2026 · 4:00 p. m. – 4:50 p. m."
 */
export function calendarEventUnifiedTimeline(ev: GoogleCalendarEventDTO): string {
  if (!ev.startAt) return "Sin fecha"
  if (ev.allDay) {
    const k = localDateKeyFromIso(ev.startAt) ?? ev.startAt.slice(0, 10)
    if (k.length < 10) return "Todo el día"
    const y = Number(k.slice(0, 4))
    const m = Number(k.slice(5, 7)) - 1
    const d = Number(k.slice(8, 10))
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "Todo el día"
    const dt = new Date(y, m, d)
    const datePart = dt.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    return `Todo el día · ${datePart}`
  }
  const start = new Date(ev.startAt)
  if (Number.isNaN(start.getTime())) return "Sin horario"
  const datePart = start.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const tf = (dt: Date) =>
    dt.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
  if (ev.endAt) {
    const end = new Date(ev.endAt)
    if (!Number.isNaN(end.getTime())) return `${datePart} · ${tf(start)} – ${tf(end)}`
  }
  return `${datePart} · ${tf(start)}`
}

/** Texto "Vence: …" para eventos de calendario usando el día local de inicio. */
export function calendarEventVenceLine(ev: GoogleCalendarEventDTO): string {
  if (!ev.startAt || ev.startAt.length < 10) return venceLine("")
  const localKey = localDateKeyFromIso(ev.startAt) ?? ev.startAt.slice(0, 10)
  return venceLine(localKey)
}

export function calendarEventFuenteLabel(ev: GoogleCalendarEventDTO): string {
  const s = (ev.summary || "").toLowerCase()
  if (/reuni[oó]n|sync|standup|weekly|team|meet|call|video|planning|q\d/i.test(s)) return "Reunión"
  return "Google Calendar"
}

export function reminderFuenteLabel(): string {
  return "Recordatorio"
}
