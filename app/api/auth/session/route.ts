import { NextRequest, NextResponse } from "next/server"
import { ORVITA_AUTH_COOKIE } from "@/lib/auth/middlewareSession"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const AUTH_COOKIE = ORVITA_AUTH_COOKIE

function extractBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing bearer token" },
      { status: 401 }
    )
  }

  const supabase = createClient({ accessToken: token })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
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
