import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { normalizeAppleHealthRows } from "@/lib/integrations/appleHealth"
import { buildMockHealthMetric } from "@/lib/integrations/mockData"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const body = (await req.json().catch(() => ({}))) as { entries?: unknown }
    const rows = normalizeAppleHealthRows(body.entries)
    const nowIso = new Date().toISOString()

    const finalRows =
      rows.length > 0
        ? rows
        : [
            {
              observed_at: nowIso,
              ...buildMockHealthMetric(),
            },
          ]

    const { error: insertError } = await supabase.from("health_metrics").insert(
      finalRows.map((row) => ({
        user_id: userId,
        source: "apple_health_export",
        observed_at: row.observed_at ?? nowIso,
        sleep_hours: row.sleep_hours ?? null,
        hrv_ms: row.hrv_ms ?? null,
        readiness_score: row.readiness_score ?? null,
        steps: row.steps ?? null,
        calories: row.calories ?? null,
        metadata: { imported_via: "apple_health_json", phase: "1.1" },
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
        metadata: { mode: "apple_health_priority", import_rows: finalRows.length },
        updated_at: nowIso,
      },
      { onConflict: "user_id,integration,provider_account_id" },
    )
    if (connError) throw new Error(connError.message)

    return NextResponse.json({
      success: true,
      imported: finalRows.length,
      source: "apple_health_export",
      syncedAt: nowIso,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar Apple Health"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
