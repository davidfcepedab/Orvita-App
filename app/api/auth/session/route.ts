import { NextRequest, NextResponse } from "next/server"
import { ORVITA_AUTH_COOKIE } from "@/lib/auth/middlewareSession"
import { verifySupabaseAccessToken } from "@/lib/auth/verifySupabaseAccessToken"

export const runtime = "nodejs"
/** Hobby: tope efectivo ~10s; deja explícito el presupuesto de esta ruta crítica. */
export const maxDuration = 10

const AUTH_COOKIE = ORVITA_AUTH_COOKIE

function extractBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

/** Si `SUPABASE_JWT_SECRET` está bien, casi nunca se usa (evita I/O a Auth enfermo). */
const GET_USER_FALLBACK_MS = 8_000

async function assertValidAccessToken(token: string): Promise<boolean> {
  const local = await verifySupabaseAccessToken(token)
  if (local) return true

  const { createClient } = await import("@/lib/supabase/server")
  const supabase = createClient({ accessToken: token })

  const getUserPromise = supabase.auth.getUser().then((r) => ({ kind: "done" as const, r }))
  const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
    setTimeout(() => resolve({ kind: "timeout" }), GET_USER_FALLBACK_MS)
  })
  const out = await Promise.race([getUserPromise, timeoutPromise])
  if (out.kind === "timeout") return false
  const { data, error } = out.r
  return !error && !!data.user
}

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing bearer token" },
      { status: 401 }
    )
  }

  const ok = await assertValidAccessToken(token)
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: invalid token" },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ success: true })
  const secure = process.env.NODE_ENV === "production"
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(AUTH_COOKIE, "", {
    path: "/",
    maxAge: 0,
  })
  return response
}
