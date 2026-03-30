import type { GoogleTaskDTO } from "@/lib/google/types"

/** Ventana única en UI (lista mezclada, paneles Google, recordatorios). */
export const GOOGLE_AGENDA_WINDOW_DAYS = 14

/** Máximo de recordatorios en la vista lista mezclada. */
export const GOOGLE_AGENDA_LIST_REMINDER_LIMIT = 48

/** Máximo en el panel lateral de recordatorios. */
export const GOOGLE_AGENDA_PANEL_REMINDER_LIMIT = 24

export function parseGoogleTaskDue(due: string | null): Date | null {
  if (!due) return null
  const d = new Date(due)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isGoogleTaskDone(status: string | null) {
  const s = (status || "").toLowerCase()
  return s === "completed"
}

/** Próximos `horizonDays` días, no completadas, orden por vencimiento (misma regla en lista y panel). */
export function upcomingGoogleReminders(
  tasks: GoogleTaskDTO[],
  horizonDays = GOOGLE_AGENDA_WINDOW_DAYS,
  limit = GOOGLE_AGENDA_LIST_REMINDER_LIMIT
): GoogleTaskDTO[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(start)
  horizon.setDate(horizon.getDate() + horizonDays)
  return tasks
    .filter((t) => {
      if (isGoogleTaskDone(t.status)) return false
      const d = parseGoogleTaskDue(t.due)
      if (!d) return false
      return d >= start && d <= horizon
    })
    .sort((a, b) => {
      const da = parseGoogleTaskDue(a.due)?.getTime() ?? 0
      const db = parseGoogleTaskDue(b.due)?.getTime() ?? 0
      return da - db
    })
    .slice(0, limit)
}
