import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { CheckinBodyMetrics } from "@/lib/checkins/checkinPayload"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      const today = agendaTodayYmd()
      const body: CheckinBodyMetrics = {
        fecha_reportada: today,
        peso: "78.0",
        pct_grasa: "16.0",
        cintura: "86",
      }
      return NextResponse.json({
        success: true,
        reported_date: today,
        body_metrics: body,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const dateParam = req.nextUrl.searchParams.get("date")?.trim()

    const base = supabase.from("checkins").select("body_metrics, reported_date").eq("user_id", userId)

    const { data, error } = dateParam
      ? await base.eq("reported_date", dateParam).maybeSingle()
      : await base
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      success: true,
      reported_date: (data?.reported_date as string | undefined) ?? null,
      body_metrics: (data?.body_metrics as CheckinBodyMetrics | null | undefined) ?? null,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    console.error("CHECKIN BODY SNAPSHOT:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
