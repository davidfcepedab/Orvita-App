export type GoogleCalendarEventDTO = {
  id: string
  summary: string
  startAt: string | null
  endAt: string | null
  allDay: boolean
}

/** Prioridad solo en Órvita (columna local en `external_tasks`); Google Tasks no la tiene. */
export type GoogleTaskLocalPriority = "Alta" | "Media" | "Baja"

export type GoogleTaskDTO = {
  id: string
  title: string
  status: string | null
  due: string | null
  /** Responsable del hogar (persistido en Órvita, no en Google). */
  localAssigneeUserId?: string | null
  localPriority?: GoogleTaskLocalPriority | null
}
