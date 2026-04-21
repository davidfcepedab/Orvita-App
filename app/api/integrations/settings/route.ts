import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

type SettingsPatch = {
  health_enabled?: boolean
  banking_enabled?: boolean
  push_enhanced_enabled?: boolean
}

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId, supabase } = auth

  const { data, error } = await supabase
    .from("integration_settings")
    .select("health_enabled,banking_enabled,push_enhanced_enabled,updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    settings: data ?? {
      health_enabled: false,
      banking_enabled: false,
      push_enhanced_enabled: true,
      updated_at: null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { userId, supabase } = auth

  const body = (await req.json().catch(() => ({}))) as SettingsPatch
  const patch: SettingsPatch = {}
  if (typeof body.health_enabled === "boolean") patch.health_enabled = body.health_enabled
  if (typeof body.banking_enabled === "boolean") patch.banking_enabled = body.banking_enabled
  if (typeof body.push_enhanced_enabled === "boolean") patch.push_enhanced_enabled = body.push_enhanced_enabled

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: "No hay campos para actualizar" }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("integration_settings")
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: nowIso,
      },
      { onConflict: "user_id" },
    )
    .select("health_enabled,banking_enabled,push_enhanced_enabled,updated_at")
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, settings: data })
}
