import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

type CalendarGetPayload = {
  success?: boolean
  events?: GoogleCalendarEventDTO[]
  connected?: boolean
  notice?: string
  error?: string
}

type CalendarGetResult = { res: Response; payload: CalendarGetPayload }

const inflight = new Map<string, Promise<CalendarGetResult>>()

/**
 * Varias instancias de `useGoogleCalendar` (p. ej. Hoy + Agenda) comparten la misma petición
 * si la URL coincide (incl. Strict Mode doble montaje).
 */
export function fetchGoogleCalendarGetCoalesced(url: string): Promise<CalendarGetResult> {
  const existing = inflight.get(url)
  if (existing) return existing

  const p = (async (): Promise<CalendarGetResult> => {
    const fetchCal = (h: HeadersInit) => fetch(url, { cache: "no-store", headers: h })
    let res = await fetchCal(await browserBearerHeaders())
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 450))
      res = await fetchCal(await browserBearerHeaders())
    }
    const payload = (await res.json()) as CalendarGetPayload
    return { res, payload }
  })().finally(() => {
    inflight.delete(url)
  })

  inflight.set(url, p)
  return p
}
