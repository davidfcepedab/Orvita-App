import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

/** Segunda línea estándar: siempre prefijo `Vence:`. `dueDateKey` es YYYY-MM-DD como fecha civil local. */
export function venceLine(dueDateKey: string): string {
  if (!dueDateKey || dueDateKey.length < 10) return "Vence: sin fecha"
  const y = Number(dueDateKey.slice(0, 4))
  const mo = Number(dueDateKey.slice(5, 7)) - 1
  const d = Number(dueDateKey.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "Vence: sin fecha"
  const today = new Date()
  const target = new Date(y, mo, d)
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const targetKey = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.round((targetKey - todayKey) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Vence: Hoy"
  if (diffDays === 1) return "Vence: Mañana"
  if (diffDays === -1) return "Vence: Ayer"
  if (diffDays < -1) return "Vence: Atrasada"

  const weekday = target.toLocaleDateString("es-CO", { weekday: "long" })
  if (diffDays <= 7) return `Vence: el ${weekday}`
  return `Vence: el ${weekday} (próx. semana)`
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

/** Primera línea de tiempo para evento Google: hora local o todo el día (no UTC crudo). */
export function calendarEventScheduleLine(ev: GoogleCalendarEventDTO): string {
  if (ev.allDay) return "Todo el día"
  if (!ev.startAt) return "Sin horario"
  const start = new Date(ev.startAt)
  if (Number.isNaN(start.getTime())) return "Sin horario"
  const tf = (dt: Date) =>
    dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })
  if (ev.endAt) {
    const end = new Date(ev.endAt)
    if (!Number.isNaN(end.getTime())) return `${tf(start)} – ${tf(end)}`
  }
  return `${tf(start)} h`
}

/** Texto "Vence: …" para eventos de calendario usando el día local de inicio. */
export function calendarEventVenceLine(ev: GoogleCalendarEventDTO): string {
  if (ev.allDay && ev.startAt && ev.startAt.length >= 10) {
    return venceLine(ev.startAt.slice(0, 10))
  }
  const localKey = localDateKeyFromIso(ev.startAt)
  return venceLine(localKey ?? "")
}

export function calendarEventFuenteLabel(ev: GoogleCalendarEventDTO): string {
  const s = (ev.summary || "").toLowerCase()
  if (/reuni[oó]n|sync|standup|weekly|team|meet|call|video|planning|q\d/i.test(s)) return "Reunión"
  return "Google Calendar"
}

export function reminderFuenteLabel(): string {
  return "Recordatorio"
}
