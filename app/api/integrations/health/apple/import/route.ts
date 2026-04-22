import { NextRequest, NextResponse } from "next/server"
import { normalizeAppleBundle, normalizeAppleHealthRows } from "@/lib/integrations/appleHealth"
import { rowsFromAppleBundlePayload } from "@/lib/integrations/mergeAppleHealthImportRows"
import { resolveAppleHealthImportAuth } from "@/lib/integrations/resolveAppleHealthImportAuth"

export const runtime = "nodejs"

function rowHasSignal(row: {
  sleep_hours?: number
  hrv_ms?: number
  readiness_score?: number
  steps?: number
  calories?: number
  energy_index?: number
  resting_hr_bpm?: number
  apple_workouts_count?: number
  apple_workout_minutes?: number
  metadata?: Record<string, unknown>
}) {
  const extras = row.metadata?.shortcut_bundle_extras
  if (extras && typeof extras === "object" && extras !== null && Object.keys(extras as Record<string, unknown>).length > 0) {
    return true
  }
  return (
    typeof row.sleep_hours === "number" ||
    typeof row.hrv_ms === "number" ||
    typeof row.readiness_score === "number" ||
    typeof row.steps === "number" ||
    typeof row.calories === "number" ||
    typeof row.energy_index === "number" ||
    typeof row.resting_hr_bpm === "number" ||
    typeof row.apple_workouts_count === "number" ||
    typeof row.apple_workout_minutes === "number"
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const auth = await resolveAppleHealthImportAuth(req, body)
    if (auth instanceof NextResponse) return auth

    const { userId, supabase } = auth

    const bundle = normalizeAppleBundle(body.apple_bundle)
    const fromBundle = bundle ? rowsFromAppleBundlePayload(bundle) : []
    const normalized = normalizeAppleHealthRows(body.entries)
    const merged = [...fromBundle, ...normalized].filter(rowHasSignal)

    const nowIso = new Date().toISOString()

    if (merged.length === 0) {
      if (auth.kind === "session") {
        return NextResponse.json({
          success: true,
          imported: 0,
          source: "apple_health_export",
          syncedAt: nowIso,
          notice:
            "No llegaron métricas en el cuerpo. Para datos reales, abre Salud y usa el Atajo “Órvita – Importar Salud Hoy”.",
        })
      }
      return NextResponse.json(
        {
          success: false,
          error:
            "No llegaron datos útiles. Envía apple_bundle (desde el Atajo) o entries con al menos una métrica numérica.",
        },
        { status: 400 },
      )
    }

    const { error: insertError } = await supabase.from("health_metrics").insert(
      merged.map((row) => ({
        user_id: userId,
        source: "apple_health_export",
        observed_at: row.observed_at ?? nowIso,
        sleep_hours: row.sleep_hours ?? null,
        hrv_ms: row.hrv_ms ?? null,
        readiness_score: row.readiness_score ?? null,
        steps: row.steps ?? null,
        calories: row.calories ?? null,
        energy_index: row.energy_index ?? null,
        resting_hr_bpm: row.resting_hr_bpm ?? null,
        apple_workouts_count: row.apple_workouts_count ?? null,
        apple_workout_minutes: row.apple_workout_minutes ?? null,
        metadata: {
          imported_via: "apple_health_json",
          phase: "1.2",
          ...(row.metadata ?? {}),
        },
      })),
    )
    if (insertError) throw new Error(insertError.message)

    const { error: connError } = await supabase.from("integration_connections").upsert(
      {
        user_id: userId,
        integration: "apple_health_export",
        provider_account_id: "apple-default",
        access_token: "server-apple-health-placeholder",
        connected: true,
        last_synced_at: nowIso,
        metadata: { mode: "apple_health_priority", import_rows: merged.length },
        updated_at: nowIso,
      },
      { onConflict: "user_id,integration,provider_account_id" },
    )
    if (connError) throw new Error(connError.message)

    return NextResponse.json({
      success: true,
      imported: merged.length,
      source: "apple_health_export",
      syncedAt: nowIso,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar Apple Health"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
