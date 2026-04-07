import type { SupabaseClient } from "@supabase/supabase-js"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

/** Margen extra antes de `timeMin` para capturar eventos largos que empezaron antes de la ventana. */
const START_AT_LOOKBACK_DAYS = 2000

export function isoAddUtcDays(iso: string, days: number): string {
  const m = Date.parse(iso)
  if (Number.isNaN(m)) return iso
  const d = new Date(m)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export function calendarRowOverlapsWindow(
  startAt: string | null,
  endAt: string | null,
  timeMin: string,
  timeMax: string,
): boolean {
  const s = startAt ? Date.parse(startAt) : NaN
  if (!Number.isFinite(s)) return false
  const w0 = Date.parse(timeMin)
  const w1 = Date.parse(timeMax)
  if (!Number.isFinite(w0) || !Number.isFinite(w1)) return false
  const e = endAt ? Date.parse(endAt) : s + 3_600_000
  if (!Number.isFinite(e)) return s < w1 && s >= w0
  return s < w1 && e > w0
}

function allDayFromRaw(raw: unknown): boolean {
  const r = raw as { start?: { date?: string; dateTime?: string } } | null
  return Boolean(r?.start?.date && !r?.start?.dateTime)
}

export function externalCalendarRowToDto(row: {
  google_event_id: string
  summary: string | null
  start_at: string | null
  end_at: string | null
  raw: unknown
}): GoogleCalendarEventDTO | null {
  if (!row.google_event_id || !row.start_at) return null
  return {
    id: row.google_event_id,
    summary: row.summary?.trim() ? row.summary.trim() : "(Sin título)",
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: allDayFromRaw(row.raw),
  }
}

type ExternalCalRow = {
  google_event_id: string
  summary: string | null
  start_at: string | null
  end_at: string | null
  raw: unknown
}

/**
 * Eventos para la ventana solicitada, leídos solo de `external_calendar_events` (sin llamar a Google).
 */
export async function fetchCalendarEventsFromExternalTable(
  supabase: SupabaseClient,
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<{ events: GoogleCalendarEventDTO[]; dbError: string | null }> {
  const extendedMin = isoAddUtcDays(timeMin, -START_AT_LOOKBACK_DAYS)
  const { data, error } = await supabase
    .from("external_calendar_events")
    .select("google_event_id, summary, start_at, end_at, raw")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("start_at", extendedMin)
    .lte("start_at", timeMax)
    .order("start_at", { ascending: true })
    .limit(6000)

  if (error) {
    return { events: [], dbError: error.message }
  }

  const rows = (data ?? []) as ExternalCalRow[]
  const events = rows
    .filter((r) => calendarRowOverlapsWindow(r.start_at, r.end_at, timeMin, timeMax))
    .map((r) => externalCalendarRowToDto(r))
    .filter((e): e is GoogleCalendarEventDTO => e != null)

  return { events, dbError: null }
}
