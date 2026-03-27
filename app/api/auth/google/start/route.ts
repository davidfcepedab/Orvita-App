import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { buildGoogleAuthUrl } from "@/lib/integrations/google"

export const runtime = "nodejs"

const STATE_COOKIE = "orvita_google_oauth_state"
const ACCESS_COOKIE = "orvita_google_access_token"

function extractBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const accessToken = extractBearerToken(req)
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing bearer token" },
      { status: 401 }
    )
  }

  const state = crypto.randomUUID()
  const redirectUrl = buildGoogleAuthUrl(state)
  const response = NextResponse.redirect(redirectUrl)

  const secure = process.env.NODE_ENV === "production"
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })

  return response
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const accessToken = extractBearerToken(req)
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing bearer token" },
      { status: 401 }
    )
  }

  const state = crypto.randomUUID()
  const redirectUrl = buildGoogleAuthUrl(state)
  const response = NextResponse.json({ success: true, url: redirectUrl })

  const secure = process.env.NODE_ENV === "production"
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })

  return response
}
