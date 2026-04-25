import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { buildShortcutAnalyticsPayload, type HealthMetricRowLike } from "@/lib/health/shortcutHealthAnalytics"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { data: rows, error } = await supabase
      .from("health_metrics")
      .select(
        "observed_at,sleep_hours,hrv_ms,readiness_score,steps,calories,energy_index,resting_hr_bpm,apple_workouts_count,apple_workout_minutes,source,metadata",
      )
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(30)

    if (error) throw new Error(error.message)
    const latest = rows?.[0] ?? null
    const timeline = (rows ?? []).reverse() as HealthMetricRowLike[]
    const analytics = buildShortcutAnalyticsPayload(timeline, (latest as HealthMetricRowLike) ?? null)

    return NextResponse.json({
      success: true,
      latest,
      timeline,
      analytics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer métricas de salud"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
