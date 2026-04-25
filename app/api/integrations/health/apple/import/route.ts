import { NextRequest, NextResponse } from "next/server"
import type { AppleHealthImportRow } from "@/lib/integrations/appleHealth"
import { normalizeAppleHealthRows } from "@/lib/integrations/appleHealth"
import { rowsFromAppleBundlePayload } from "@/lib/integrations/mergeAppleHealthImportRows"
import { extractHealthBundleFromBody, normalizeAppleHealthPayload } from "@/lib/integrations/normalizeAppleHealthPayload"
import { upsertAppleHealthImportRow } from "@/lib/integrations/upsertHealthMetricRow"
import { resolveAppleHealthImportAuth } from "@/lib/integrations/resolveAppleHealthImportAuth"

export const runtime = "nodejs"

const SOURCE: "apple_health_export" = "apple_health_export"

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

function logImport(ev: {
  event: "hit" | "success" | "error"
  received_keys: string[]
  accepted_metrics?: string[]
  observed_at?: string
  persistence?: "ok" | "fail"
  message?: string
}) {
  if (ev.event === "hit") {
    console.info("[apple-import]", ev.event, { received_keys: ev.received_keys })
  } else if (ev.event === "success") {
    console.info("[apple-import]", ev.event, {
      received_keys: ev.received_keys,
      accepted_metrics: ev.accepted_metrics,
      observed_at: ev.observed_at,
      persistence: ev.persistence,
    })
  } else {
    console.warn("[apple-import]", ev.event, { received_keys: ev.received_keys, message: ev.message })
  }
}

function normalizedPayloadForResponse(
  norm: ReturnType<typeof normalizeAppleHealthPayload>,
  firstRow: AppleHealthImportRow | null,
) {
  if (norm.ok) {
    const o: Record<string, string | number> = { observed_at: norm.observed_at }
    for (const [k, v] of Object.entries(norm.normalized)) {
      if (v !== undefined && v !== null) o[k] = v as number
    }
    return o
  }
  if (!firstRow) return null
  const m = firstRow.metadata as Record<string, unknown> | undefined
  const sds = typeof m?.apple_sleep_duration_seconds === "number" ? m.apple_sleep_duration_seconds : undefined
  const wds = typeof m?.apple_workouts_duration_seconds === "number" ? m.apple_workouts_duration_seconds : undefined
  const hrvP = m?.hrv_ms_precise
  return {
    observed_at: firstRow.observed_at?.slice(0, 10) ?? "",
    steps: firstRow.steps,
    hrv_ms: typeof hrvP === "number" ? Math.round((hrvP as number) * 10) / 10 : firstRow.hrv_ms,
    resting_hr_bpm: firstRow.resting_hr_bpm,
    active_energy_kcal: firstRow.calories,
    workouts_duration_seconds: wds,
    sleep_duration_seconds: sds,
  }
}

function acceptedListFromNorm(norm: ReturnType<typeof normalizeAppleHealthPayload>, row: AppleHealthImportRow) {
  if (norm.ok) return norm.accepted_metrics.map(String)
  const keys: string[] = []
  if (row.steps != null) keys.push("steps")
  if (row.hrv_ms != null) keys.push("hrv_ms")
  if (row.resting_hr_bpm != null) keys.push("resting_hr_bpm")
  if (row.calories != null) keys.push("active_energy_kcal")
  if (row.apple_workout_minutes != null) keys.push("workouts_duration_seconds")
  if (row.sleep_hours != null) keys.push("sleep_duration_seconds")
  return keys
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const topKeys = Object.keys(body)
    logImport({ event: "hit", received_keys: topKeys })

    const auth = await resolveAppleHealthImportAuth(req, body)
    if (auth instanceof NextResponse) return auth

    const { userId, supabase } = auth

    const ext = extractHealthBundleFromBody(body)
    const fromBundle = ext ? rowsFromAppleBundlePayload(ext.bundle) : []
    const normalized = normalizeAppleHealthRows(body.entries)
    const useMerged = [...fromBundle, ...normalized].filter(rowHasSignal)
    const norm = normalizeAppleHealthPayload(body)
    const nowIso = new Date().toISOString()

    if (useMerged.length === 0) {
      if (!norm.ok) {
        return NextResponse.json(
          {
            success: false,
            error: norm.error,
            received_keys: topKeys,
            hint: norm.hint,
            field_errors: norm.field_errors,
          },
          { status: 400 },
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "No numeric health metrics received",
          received_keys: topKeys,
          hint: "Send apple_bundle or flat payload with at least one numeric metric.",
        },
        { status: 400 },
      )
    }

    let lastPersistence: "ok" | "fail" = "ok"
    for (const row of useMerged) {
      const u = await upsertAppleHealthImportRow(supabase, userId, SOURCE, row)
      if ("error" in u) {
        lastPersistence = "fail"
        logImport({ event: "error", received_keys: topKeys, message: u.error })
        throw new Error(u.error)
      }
    }

    const { error: connError } = await supabase.from("integration_connections").upsert(
      {
        user_id: userId,
        integration: "apple_health_export",
        provider_account_id: "apple-default",
        access_token: "server-apple-health-placeholder",
        connected: true,
        last_synced_at: nowIso,
        metadata: { mode: "apple_health_priority", import_rows: useMerged.length },
        updated_at: nowIso,
      },
      { onConflict: "user_id,integration,provider_account_id" },
    )
    if (connError) {
      lastPersistence = "fail"
      logImport({ event: "error", received_keys: topKeys, message: connError.message })
      throw new Error(connError.message)
    }

    const first = useMerged[0] ?? null
    const accepted = acceptedListFromNorm(norm, first!)

    logImport({
      event: "success",
      received_keys: topKeys,
      accepted_metrics: accepted,
      observed_at: first?.observed_at,
      persistence: lastPersistence,
    })

    return NextResponse.json({
      success: true,
      observed_at: (norm.ok ? norm.observed_at : first?.observed_at?.slice(0, 10)) ?? null,
      observed_at_inferred: norm.ok ? norm.observed_at_inferred : false,
      accepted_metrics: accepted,
      normalized: normalizedPayloadForResponse(norm, first),
      raw_payload_debug:
        process.env.NODE_ENV === "development"
          ? { keys: ext ? Object.keys(ext.bundle) : [], schema_version: body.schema_version }
          : undefined,
      imported: useMerged.length,
      source: SOURCE,
      syncedAt: nowIso,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar Apple Health"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
