import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_GOOGLE_CALENDAR_OFF } from "@/lib/checkins/flags"
import { fetchPrimaryCalendarWindow } from "@/lib/google/googleCalendarApi"
import { getGoogleAccessTokenForUser } from "@/lib/google/loadAccessToken"
import { MOCK_GOOGLE_CALENDAR_EVENTS } from "@/lib/google/mockGoogleData"

export const runtime = "nodejs"

function defaultWindow() {
  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + 14)
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
    return NextResponse.json({ success: false, error: "No se pudo leer el calendario" }, { status: 502 })
  }
}
