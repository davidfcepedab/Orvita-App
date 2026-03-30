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

/** Límite de filas Google Tasks en la cronología lista/kanban (evita listas enormes). */
export const GOOGLE_AGENDA_TIMELINE_MERGE_LIMIT = 250

/**
 * Tareas Google activas con fecha de vencimiento válida (YYYY-MM-DD o datetime).
 * Usar para Semana/Mes: cada tarea cae en su día de vencimiento, sin ventana de 14 días ni tope global.
 */
export function googleTasksWithDueForDayIndex(tasks: GoogleTaskDTO[]): GoogleTaskDTO[] {
  return tasks
    .filter((t) => {
      if (isGoogleTaskDone(t.status)) return false
      if (!t.due || t.due.length < 10) return false
      return parseGoogleTaskDue(t.due) != null
    })
    .sort((a, b) => {
      const da = parseGoogleTaskDue(a.due)?.getTime() ?? 0
      const db = parseGoogleTaskDue(b.due)?.getTime() ?? 0
      return da - db || (a.title || "").localeCompare(b.title || "", "es")
    })
}

/** Tareas sin fecha de vencimiento (aparecen al final de la lista mezclada, no en celdas de calendario). */
export const GOOGLE_AGENDA_UNDATED_MERGE_LIMIT = 80

export function googleTasksWithoutDueForMerge(
  tasks: GoogleTaskDTO[],
  limit = GOOGLE_AGENDA_UNDATED_MERGE_LIMIT
): GoogleTaskDTO[] {
  return tasks
    .filter((t) => !isGoogleTaskDone(t.status) && parseGoogleTaskDue(t.due) == null)
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "es"))
    .slice(0, limit)
}

/**
 * Lista/kanban: con fecha (todas las activas con due, hasta límite) + sin fecha al final.
 * Alinea mejor con el panel Tasks que la ventana corta de solo “próximos 14 días”.
 */
export function googleTasksForTimelineMerge(tasks: GoogleTaskDTO[]): GoogleTaskDTO[] {
  const dated = googleTasksWithDueForDayIndex(tasks).slice(0, GOOGLE_AGENDA_TIMELINE_MERGE_LIMIT)
  const undated = googleTasksWithoutDueForMerge(tasks)
  return [...dated, ...undated]
}
