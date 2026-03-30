import type { GoogleCalendarEventDTO } from "@/lib/google/types"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

/** Segunda línea estándar: siempre prefijo `Vence:`. */
export function venceLine(dueDateKey: string): string {
  if (!dueDateKey || dueDateKey.length < 10) return "Vence: sin fecha"
  const today = new Date()
  const target = new Date(dueDateKey)
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

/** Primera línea de tiempo para evento Google: hora o todo el día. */
export function calendarEventScheduleLine(ev: GoogleCalendarEventDTO): string {
  if (!ev.startAt) return "Sin horario"
  if (ev.allDay) return "Todo el día"
  return `${ev.startAt.slice(11, 16)} h`
}

export function calendarEventFuenteLabel(ev: GoogleCalendarEventDTO): string {
  const s = (ev.summary || "").toLowerCase()
  if (/reuni[oó]n|sync|standup|weekly|team|meet|call|video|planning|q\d/i.test(s)) return "Reunión"
  return "Google Calendar"
}

export function reminderFuenteLabel(): string {
  return "Recordatorio"
}
