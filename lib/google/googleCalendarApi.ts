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
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Calendar: ${detail}`)
  }

  const payload = (await response.json()) as CalendarListResponse
  const items = payload.items ?? []
  const out: GoogleCalendarEventDTO[] = []
  for (const item of items) {
    if (item.status === "cancelled") continue
    const row = mapGoogleCalendarItem(item)
    if (row) out.push(row)
  }
  return out
}
