import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth
    const nowIso = new Date().toISOString()

    const { error: settingsError } = await supabase.from("integration_settings").upsert(
      {
        user_id: userId,
        health_enabled: true,
        updated_at: nowIso,
      },
      { onConflict: "user_id" },
    )
    if (settingsError) throw new Error(settingsError.message)

    const { error: connError } = await supabase.from("integration_connections").upsert(
      {
        user_id: userId,
        integration: "apple_health_export",
        provider_account_id: "apple-default",
        access_token: "server-apple-health-placeholder",
        connected: true,
        connected_at: nowIso,
        last_synced_at: nowIso,
        metadata: { mode: "apple_health_priority", import_method: "shortcut_or_export" },
        updated_at: nowIso,
      },
      { onConflict: "user_id,integration,provider_account_id" },
    )
    if (connError) throw new Error(connError.message)

    return NextResponse.json({
      success: true,
      connected: true,
      provider: "apple_health_export",
      message: "Apple Health conectado en modo import (prioridad activa).",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar Apple Health"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
