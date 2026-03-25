import { NextRequest, NextResponse } from "next/server"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import { listOrvitaCalendarEvents } from "@/lib/orbita/repositories/calendarRepo"

function resolveProfileId(req: NextRequest): AppProfileId {
  const param = req.nextUrl.searchParams.get("profileId")
  return isAppProfileId(param) ? param : resolveDefaultProfileId()
}

export async function GET(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const from = req.nextUrl.searchParams.get("from") || undefined
    const to = req.nextUrl.searchParams.get("to") || undefined
    const result = await listOrvitaCalendarEvents({ profileId, from, to })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error cargando eventos", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}

