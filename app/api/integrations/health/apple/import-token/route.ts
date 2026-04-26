import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { generatePlainImportToken, hashImportToken } from "@/lib/integrations/appleHealthImportToken"

export const runtime = "nodejs"

type TokenStatus = "none" | "active" | "revoked"

function isRowUsable(row: { expires_at: string | null; revoked_at: string | null }) {
  if (row.revoked_at != null) return false
  if (row.expires_at == null) return true
  const t = new Date(row.expires_at).getTime()
  return !Number.isNaN(t) && t > Date.now()
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireUser(_req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { data: active } = await supabase
      .from("orvita_health_import_tokens")
      .select("created_at, used_at, expires_at, revoked_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle()

    if (active && isRowUsable(active)) {
      return NextResponse.json({
        success: true,
        status: "active" satisfies TokenStatus,
        created_at: active.created_at as string,
        used_at: (active.used_at as string | null) ?? null,
      })
    }

    const { data: latest } = await supabase
      .from("orvita_health_import_tokens")
      .select("revoked_at, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latest) {
      return NextResponse.json({ success: true, status: "none" satisfies TokenStatus })
    }

    if (latest.revoked_at != null) {
      return NextResponse.json({ success: true, status: "revoked" satisfies TokenStatus })
    }

    return NextResponse.json({ success: true, status: "none" satisfies TokenStatus })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer el estado del token"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { error: revokeErr } = await supabase
      .from("orvita_health_import_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null)
    if (revokeErr) throw new Error(revokeErr.message)

    const plain = generatePlainImportToken()
    const token_hash = hashImportToken(plain)

    const { data: inserted, error } = await supabase
      .from("orvita_health_import_tokens")
      .insert({
        user_id: userId,
        token_hash,
        expires_at: null,
        revoked_at: null,
      })
      .select("created_at")
      .single()
    if (error) throw new Error(error.message)

    const icloud = process.env.NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL?.trim() || null
    return NextResponse.json({
      success: true,
      import_token: plain,
      created_at: (inserted?.created_at as string) ?? new Date().toISOString(),
      shortcut_file_url: "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut",
      ...(icloud ? { shortcut_icloud_url: icloud } : {}),
      import_path: "/api/integrations/health/apple/import",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el token"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const auth = await requireUser(_req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { error } = await supabase
      .from("orvita_health_import_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo revocar el token"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
