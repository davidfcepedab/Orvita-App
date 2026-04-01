import type { GoogleCalendarEventDTO } from "@/lib/google/types"

type GoogleCalendarDate = {
  dateTime?: string
  date?: string
}

type GoogleCalendarEvent = {
  id?: string
  summary?: string
  start?: GoogleCalendarDate
  end?: GoogleCalendarDate
  status?: string
}

type CalendarListResponse = {
  items?: GoogleCalendarEvent[]
  nextPageToken?: string
}

/** Error con status HTTP de Google para mapear respuestas en rutas API. */
export class GoogleCalendarRequestError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message)
    this.name = "GoogleCalendarRequestError"
  }
}

function normalizeInstant(value?: GoogleCalendarDate): { iso: string | null; allDay: boolean } {
  if (value?.dateTime) {
    const parsed = Date.parse(value.dateTime)
    return Number.isNaN(parsed) ? { iso: null, allDay: false } : { iso: new Date(parsed).toISOString(), allDay: false }
  }
  if (value?.date) {
    return { iso: `${value.date}T00:00:00.000Z`, allDay: true }
  }
  return { iso: null, allDay: false }
}

export function mapGoogleCalendarItem(event: GoogleCalendarEvent): GoogleCalendarEventDTO | null {
  const id = event.id
  if (!id) return null
  const start = normalizeInstant(event.start)
  const end = normalizeInstant(event.end)
  return {
    id,
    summary: typeof event.summary === "string" && event.summary.trim() ? event.summary : "(Sin título)",
    startAt: start.iso,
    endAt: end.iso,
    allDay: start.allDay || end.allDay,
  }
}

export async function fetchPrimaryCalendarWindow(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GoogleCalendarEventDTO[]> {
  const collected: GoogleCalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    })
    if (pageToken) params.set("pageToken", pageToken)

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      const detail = await response.text()
      throw new GoogleCalendarRequestError(`Google Calendar: ${detail}`, response.status)
    }

    const payload = (await response.json()) as CalendarListResponse
    const items = payload.items ?? []
    collected.push(...items)
    pageToken = payload.nextPageToken
  } while (pageToken)

  const out: GoogleCalendarEventDTO[] = []
  for (const item of collected) {
    if (item.status === "cancelled") continue
    const row = mapGoogleCalendarItem(item)
    if (row) out.push(row)
  }
  return out
}

function addUtcCalendarDay(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type InsertTaskCalendarEventInput = {
  title: string
  dueDate: string | null
  estimatedMinutes: number
}

/** Crea un evento en el calendario principal: día completo si hay dueDate, si no bloque timed desde ahora. */
export async function insertPrimaryCalendarEventForTask(
  accessToken: string,
  input: InsertTaskCalendarEventInput,
): Promise<GoogleCalendarEvent> {
  const summary = input.title.trim() || "Órvita"
  const minutes = Math.min(Math.max(Number(input.estimatedMinutes) || 30, 15), 8 * 60)

  let body: Record<string, unknown>
  if (input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    body = {
      summary,
      start: { date: input.dueDate },
      end: { date: addUtcCalendarDay(input.dueDate, 1) },
    }
  } else {
    const start = new Date()
    const end = new Date(start.getTime() + minutes * 60_000)
    body = {
      summary,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }
  }

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Calendar create: ${detail}`)
  }

  return (await response.json()) as GoogleCalendarEvent
}

export async function deletePrimaryCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const id = encodeURIComponent(eventId)
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (response.status === 204 || response.status === 200) return
  if (response.status === 404) return
  const detail = await response.text()
  throw new Error(`Google Calendar delete: ${detail}`)
}
