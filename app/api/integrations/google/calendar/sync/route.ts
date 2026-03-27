import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { refreshAccessTokenIfNeeded, type GoogleIntegrationRecord } from "@/lib/integrations/google"

export const runtime = "nodejs"

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
  deleted?: boolean
  updated?: string
  [key: string]: unknown
}

type CalendarApiResponse = {
  items?: GoogleCalendarEvent[]
  nextPageToken?: string
}

function normalizeDateTime(value?: GoogleCalendarDate): string | null {
  if (value?.dateTime) {
    const parsed = Date.parse(value.dateTime)
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
  }
  if (value?.date) {
    const parsed = Date.parse(`${value.date}T00:00:00Z`)
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const { data: integration, error: integrationError } = await supabase
      .from("user_integrations")
      .select("id, user_id, provider, access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle()

    if (integrationError) throw integrationError
    if (!integration) {
      return NextResponse.json(
        { success: false, error: "Google integration not found" },
        { status: 404 }
      )
    }

    const accessToken = await refreshAccessTokenIfNeeded(integration as GoogleIntegrationRecord)

    const { data: lastSync } = await supabase
      .from("external_calendar_events")
      .select("synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const updatedMin = lastSync?.synced_at ? new Date(lastSync.synced_at).toISOString() : null

    let pageToken: string | undefined
    let imported = 0
    let updated = 0

    do {
      const params = new URLSearchParams({
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "250",
      })
      if (updatedMin) params.set("updatedMin", updatedMin)
      if (pageToken) params.set("pageToken", pageToken)

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Google Calendar API error: ${detail}`)
      }

      const payload = (await response.json()) as CalendarApiResponse
      const items = payload.items ?? []

      const ids = items
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)

      if (ids.length > 0) {
        const { data: existing } = await supabase
          .from("external_calendar_events")
          .select("google_event_id")
          .eq("user_id", userId)
          .in("google_event_id", ids)

        const existingSet = new Set(
          (existing ?? []).map((row) => row.google_event_id).filter((id) => typeof id === "string")
        )

        imported += ids.length - existingSet.size
        updated += existingSet.size

        const now = new Date().toISOString()
        const rows = items
          .map((event) => {
            const googleEventId = event.id
            if (!googleEventId) return null
            const startAt = normalizeDateTime(event.start)
            const endAt = normalizeDateTime(event.end)
            const isDeleted = event.status === "cancelled" || event.deleted === true
            return {
              user_id: userId,
              google_event_id: googleEventId,
              summary: event.summary ?? null,
              start_at: startAt,
              end_at: endAt,
              raw: event as Record<string, unknown>,
              synced_at: now,
              deleted_at: isDeleted ? now : null,
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)

        if (rows.length > 0) {
          const { error: upsertError } = await supabase
            .from("external_calendar_events")
            .upsert(rows, { onConflict: "user_id,google_event_id" })
          if (upsertError) throw upsertError
        }
      }

      pageToken = payload.nextPageToken
    } while (pageToken)

    return NextResponse.json({ success: true, imported, updated })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("GOOGLE CALENDAR SYNC ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo sincronizar calendario" },
      { status: 500 }
    )
  }
}
