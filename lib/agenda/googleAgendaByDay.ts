import { calendarEventLocalDayKey, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import type { GoogleCalendarEventDTO, GoogleTaskDTO } from "@/lib/google/types"
import { googleTasksWithDueForDayIndex } from "@/lib/agenda/googleTasksUpcoming"

export type GoogleDayBucket = {
  events: GoogleCalendarEventDTO[]
  reminders: GoogleTaskDTO[]
}

/** Agrupa eventos (por día de inicio) y Google Tasks por día de vencimiento (todas las activas con fecha; sin ventana de 14 días). */
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
      const k = calendarEventLocalDayKey(ev)
      if (k && k.length === 10) touch(k).events.push(ev)
    }
  }
  if (tasksFeed.connected) {
    for (const r of googleTasksWithDueForDayIndex(tasksFeed.tasks)) {
      const k = localDateKeyFromIso(r.due)
      if (k && k.length === 10) touch(k).reminders.push(r)
    }
  }
  return map
}

export function countGoogleDayItems(bucket: GoogleDayBucket | undefined): number {
  if (!bucket) return 0
  return bucket.events.length + bucket.reminders.length
}
