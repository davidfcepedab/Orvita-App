import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { healthMetricObservedAtIsoForDisplay } from "@/lib/health/healthMetricCanonicalObservedAt"
import { buildShortcutAnalyticsPayload, type HealthMetricRowLike } from "@/lib/health/shortcutHealthAnalytics"

function withDisplayObservedAt(row: Record<string, unknown> | null): HealthMetricRowLike | null {
  if (!row) return null
  const observed_at_raw = typeof row.observed_at === "string" ? row.observed_at : ""
  const source = typeof row.source === "string" ? row.source : null
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null
  const observed_at = healthMetricObservedAtIsoForDisplay({
    observed_at: observed_at_raw,
    source,
    metadata,
  })
  return {
    ...(row as unknown as HealthMetricRowLike),
    observed_at: observed_at || observed_at_raw,
  }
}

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
    const latest = withDisplayObservedAt((rows?.[0] as Record<string, unknown> | undefined) ?? null)
    const timeline = (rows ?? [])
      .reverse()
      .map((r) => withDisplayObservedAt(r as Record<string, unknown>))
      .filter((r): r is HealthMetricRowLike => r != null)
    const analytics = buildShortcutAnalyticsPayload(timeline, latest)

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
