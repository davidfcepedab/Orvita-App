import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppleHealthImportRow } from "@/lib/integrations/appleHealth"

/** Origen persistido en `health_metrics.source` (Atajo iOS vs otras importaciones). */
export type HealthMetricsPersistedSource = "apple_health_export" | "apple_health_shortcut"

function dayBoundsUtcFromIso(iso: string): { start: string; end: string } | null {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return null
  const y = t.getUTCFullYear()
  const m = t.getUTCMonth()
  const d = t.getUTCDate()
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

type NullableNum = number | null | undefined

function mergeNumber(prev: NullableNum, next: NullableNum) {
  if (next == null) return prev ?? null
  return next
}

/**
 * Unifica por día natural UTC + source; hace merge parcial (solo métricas con valor) y mantiene metadata.
 */
export async function upsertAppleHealthImportRow(
  supabase: SupabaseClient,
  userId: string,
  source: HealthMetricsPersistedSource,
  row: AppleHealthImportRow,
) {
  const obs = row.observed_at
  if (!obs) {
    return { error: "missing observed_at" } as const
  }
  const bounds = dayBoundsUtcFromIso(obs)
  if (!bounds) return { error: "invalid observed_at" } as const

  const { data: existingRows, error: selErr } = await supabase
    .from("health_metrics")
    .select("id, sleep_hours, hrv_ms, readiness_score, steps, calories, resting_hr_bpm, apple_workouts_count, apple_workout_minutes, metadata")
    .eq("user_id", userId)
    .eq("source", source)
    .gte("observed_at", bounds.start)
    .lt("observed_at", bounds.end)
    .order("created_at", { ascending: false })
    .limit(1)

  if (selErr) return { error: selErr.message } as const
  const id = existingRows?.[0]?.id as string | undefined

  const prev = existingRows?.[0] as
    | {
        sleep_hours?: number | null
        hrv_ms?: number | null
        readiness_score?: number | null
        steps?: number | null
        calories?: number | null
        resting_hr_bpm?: number | null
        apple_workouts_count?: number | null
        apple_workout_minutes?: number | null
        metadata?: unknown
      }
    | undefined

  const pSleep = row.sleep_hours
  const pHrv = row.hrv_ms
  const pReady = row.readiness_score
  const pSteps = row.steps
  const pCal = row.calories
  const pRhr = row.resting_hr_bpm
  const pWc = row.apple_workouts_count
  const pWm = row.apple_workout_minutes
  const pMeta = row.metadata

  const newSleep = mergeNumber(prev?.sleep_hours ?? null, pSleep)
  const newHrv = mergeNumber(prev?.hrv_ms ?? null, pHrv)
  const newReadiness = mergeNumber(prev?.readiness_score ?? null, pReady)
  const newSteps = mergeNumber(prev?.steps ?? null, pSteps)
  const newCal = mergeNumber(prev?.calories ?? null, pCal)
  const newRhr = mergeNumber(prev?.resting_hr_bpm ?? null, pRhr)
  const newWc = mergeNumber(prev?.apple_workouts_count ?? null, pWc)
  const newWm = mergeNumber(prev?.apple_workout_minutes ?? null, pWm)
  const mergedMetadata = (() => {
    const a = (prev?.metadata as Record<string, unknown> | undefined) ?? {}
    const b = (pMeta as Record<string, unknown> | undefined) ?? {}
    return {
      ...a,
      ...b,
      merged_at: new Date().toISOString(),
      ...(source === "apple_health_shortcut" ? { ios_shortcut_import: true } : {}),
    }
  })()

  if (id) {
    const { error: up } = await supabase
      .from("health_metrics")
      .update({
        sleep_hours: newSleep,
        hrv_ms: newHrv,
        readiness_score: newReadiness,
        steps: newSteps,
        calories: newCal,
        resting_hr_bpm: newRhr,
        apple_workouts_count: newWc,
        apple_workout_minutes: newWm,
        metadata: mergedMetadata,
        observed_at: obs,
      })
      .eq("id", id)
    if (up) return { error: up.message } as const
    return { id, mode: "update" } as const
  }

  const { data: ins, error: insE } = await supabase
    .from("health_metrics")
    .insert({
      user_id: userId,
      source,
      observed_at: obs,
      sleep_hours: pSleep ?? null,
      hrv_ms: pHrv ?? null,
      readiness_score: pReady ?? null,
      steps: pSteps ?? null,
      calories: pCal ?? null,
      resting_hr_bpm: pRhr ?? null,
      apple_workouts_count: pWc ?? null,
      apple_workout_minutes: pWm ?? null,
      metadata: (pMeta as Record<string, unknown>) ?? {},
    })
    .select("id")
    .single()

  if (insE) return { error: insE.message } as const
  return { id: (ins as { id: string })?.id, mode: "insert" } as const
}
