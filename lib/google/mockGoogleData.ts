import type { GoogleCalendarEventDTO, GoogleTaskDTO } from "@/lib/google/types"

export const MOCK_GOOGLE_CALENDAR_EVENTS: GoogleCalendarEventDTO[] = [
  {
    id: "mock-cal-1",
    summary: "Stand-up equipo",
    startAt: new Date().toISOString().slice(0, 10) + "T09:00:00.000Z",
    endAt: new Date().toISOString().slice(0, 10) + "T09:30:00.000Z",
    allDay: false,
  },
  {
    id: "mock-cal-2",
    summary: "Bloque foco profundo",
    startAt: new Date().toISOString().slice(0, 10) + "T14:00:00.000Z",
    endAt: new Date().toISOString().slice(0, 10) + "T16:00:00.000Z",
    allDay: false,
  },
]

export const MOCK_GOOGLE_TASKS: GoogleTaskDTO[] = [
  { id: "mock-task-1", title: "Revisar métricas de salud", status: "needsAction", due: null },
  { id: "mock-task-2", title: "Sincronizar agenda Órbita", status: "needsAction", due: null },
]
