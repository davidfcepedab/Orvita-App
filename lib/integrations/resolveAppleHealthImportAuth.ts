import type { SupabaseClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { createServiceClient } from "@/lib/supabase/server"
import { hashImportToken } from "@/lib/integrations/appleHealthImportToken"

export type AppleImportAuth =
  | { kind: "session"; userId: string; supabase: SupabaseClient }
  | { kind: "import_token"; userId: string; supabase: SupabaseClient }

function extractBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

function extractImportToken(req: NextRequest, body: Record<string, unknown>) {
  const a = req.headers.get("x-orvita-import-token")?.trim()
  if (a) return a
  const b = req.headers.get("x-reset-token")?.trim()
  if (b) return b
  const fromBody = typeof body.import_token === "string" ? body.import_token.trim() : ""
  return fromBody || null
}

export async function resolveAppleHealthImportAuth(
  req: NextRequest,
  body: Record<string, unknown>,
): Promise<AppleImportAuth | NextResponse> {
  const bearer = extractBearerToken(req)
  if (bearer) {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    return { kind: "session", userId: auth.userId, supabase: auth.supabase }
  }

  const plain = extractImportToken(req, body)
  if (!plain) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Falta autenticación. Inicia sesión en la app o envía el token de importación (cabecera x-orvita-import-token o campo import_token).",
      },
      { status: 401 },
    )
  }

  let svc: ReturnType<typeof createServiceClient>
  try {
    svc = createServiceClient()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "El servidor no puede validar tokens de importación (falta SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY).",
      },
      { status: 503 },
    )
  }

  const digest = hashImportToken(plain)
  const { data: row, error } = await svc
    .from("orvita_health_import_tokens")
    .select("id,user_id,expires_at")
    .eq("token_hash", digest)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ success: false, error: "Token inválido o expirado." }, { status: 401 })
  }

  const expiresAt = new Date(row.expires_at as string)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ success: false, error: "Token expirado. Genera uno nuevo en Salud." }, { status: 401 })
  }

  return { kind: "import_token", userId: row.user_id as string, supabase: svc }
}
