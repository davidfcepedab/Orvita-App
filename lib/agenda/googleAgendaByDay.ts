import type { GoogleCalendarEventDTO, GoogleTaskDTO } from "@/lib/google/types"
import {
  GOOGLE_AGENDA_LIST_REMINDER_LIMIT,
  GOOGLE_AGENDA_WINDOW_DAYS,
  upcomingGoogleReminders,
} from "@/lib/agenda/googleTasksUpcoming"

export type GoogleDayBucket = {
  events: GoogleCalendarEventDTO[]
  reminders: GoogleTaskDTO[]
}

/** Agrupa eventos (por día de inicio) y recordatorios (por vencimiento) para Semana/Mes. */
export function buildGoogleByDayIndex(
  calendar: { connected: boolean; events: GoogleCalendarEventDTO[] },
  tasksFeed: { connected: boolean; tasks: GoogleTaskDTO[] }
): Record<string, GoogleDayBucket> {
  const map: Record<string, GoogleDayBucket> = {}
  const touch = (key: string): GoogleDayBucket => {
    if (!map[key]) map[key] = { events: [], reminders: [] }
    return map[key]
  }
  if (calendar.connected) {
    for (const ev of calendar.events) {
      const k = ev.startAt?.slice(0, 10)
      if (k && k.length === 10) touch(k).events.push(ev)
    }
  }
  if (tasksFeed.connected) {
    const reminders = upcomingGoogleReminders(
      tasksFeed.tasks,
      GOOGLE_AGENDA_WINDOW_DAYS,
      GOOGLE_AGENDA_LIST_REMINDER_LIMIT
    )
    for (const r of reminders) {
      const k = r.due?.slice(0, 10)
      if (k && k.length === 10) touch(k).reminders.push(r)
    }
  }
  return map
}

export function countGoogleDayItems(bucket: GoogleDayBucket | undefined): number {
  if (!bucket) return 0
  return bucket.events.length + bucket.reminders.length
}
