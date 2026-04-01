import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_GOOGLE_CALENDAR_OFF } from "@/lib/checkins/flags"
import {
  deletePrimaryCalendarEvent,
  fetchPrimaryCalendarWindow,
  GoogleCalendarRequestError,
} from "@/lib/google/googleCalendarApi"
import { getGoogleAccessTokenForUser } from "@/lib/google/loadAccessToken"
import { mapGoogleSyncErrorToUserMessage } from "@/lib/integrations/google"
import { MOCK_GOOGLE_CALENDAR_EVENTS } from "@/lib/google/mockGoogleData"

export const runtime = "nodejs"

function httpStatusFromGoogleCalendar(s: number): number {
  if (s === 401 || s === 403 || s === 429 || s === 400 || s === 404) return s
  if (s >= 500) return 502
  if (s >= 400) return 400
  return 502
}

function defaultWindow() {
  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  timeMin.setDate(timeMin.getDate() - 45)
  const timeMax = new Date()
  timeMax.setHours(23, 59, 59, 999)
  timeMax.setDate(timeMax.getDate() + 400)
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() }
}

export async function GET(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({
      success: true,
      connected: true,
      source: "mock",
      events: MOCK_GOOGLE_CALENDAR_EVENTS,
    })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      success: true,
      connected: false,
      events: [],
      notice: UI_GOOGLE_CALENDAR_OFF,
    })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const timeMin = url.searchParams.get("timeMin") ?? defaultWindow().timeMin
  const timeMax = url.searchParams.get("timeMax") ?? defaultWindow().timeMax

  const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
  if ("error" in tokenResult) {
    if (tokenResult.status === 404) {
      return NextResponse.json({
        success: true,
        connected: false,
        events: [],
        notice: "Conecta Google desde Configuración para ver el calendario.",
      })
    }
    return NextResponse.json({ success: false, error: tokenResult.error }, { status: tokenResult.status })
  }

  try {
    const events = await fetchPrimaryCalendarWindow(tokenResult.token, timeMin, timeMax)
    return NextResponse.json({ success: true, connected: true, events })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error Calendar"
    console.error("GOOGLE CALENDAR GET:", msg)
    if (e instanceof GoogleCalendarRequestError) {
      const status = httpStatusFromGoogleCalendar(e.httpStatus)
      const error = mapGoogleSyncErrorToUserMessage("calendar", msg)
      return NextResponse.json({ success: false, error }, { status })
    }
    return NextResponse.json(
      { success: false, error: mapGoogleSyncErrorToUserMessage("calendar", msg) },
      { status: 502 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({ success: false, error: "Sin sincronización" }, { status: 403 })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: { id?: string }
  try {
    body = (await req.json()) as { id?: string }
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const id = String(body?.id ?? "").trim()
  if (!id) {
    return NextResponse.json({ success: false, error: "id es obligatorio" }, { status: 400 })
  }

  const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
  if ("error" in tokenResult) {
    return NextResponse.json(
      { success: false, error: tokenResult.error },
      { status: tokenResult.status === 404 ? 400 : tokenResult.status },
    )
  }

  try {
    await deletePrimaryCalendarEvent(tokenResult.token, id)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error borrando evento"
    console.error("GOOGLE CALENDAR DELETE:", msg)
    return NextResponse.json({ success: false, error: "No se pudo borrar el evento en Google" }, { status: 502 })
  }
}
