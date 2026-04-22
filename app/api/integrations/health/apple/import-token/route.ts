import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { generatePlainImportToken, hashImportToken } from "@/lib/integrations/appleHealthImportToken"

export const runtime = "nodejs"

const DEFAULT_TTL_MIN = 24 * 60

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const body = (await req.json().catch(() => ({}))) as { ttlMinutes?: unknown }
    const ttlRaw = typeof body.ttlMinutes === "number" ? body.ttlMinutes : DEFAULT_TTL_MIN
    const ttlMinutes = Math.min(Math.max(Math.round(ttlRaw), 5), 24 * 60 * 7)
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

    const plain = generatePlainImportToken()
    const token_hash = hashImportToken(plain)

    const { error } = await supabase.from("orvita_health_import_tokens").insert({
      user_id: userId,
      token_hash,
      expires_at: expiresAt,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      import_token: plain,
      expires_at: expiresAt,
      shortcut_file_url: "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut",
      import_path: "/api/integrations/health/apple/import",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el token"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
