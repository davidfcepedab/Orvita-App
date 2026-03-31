import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE = "orvita_access_token"

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim()
  return { url, anonKey }
}

const AUTH_CHECK_TIMEOUT_MS = 12_000

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return false

  const { url, anonKey } = getSupabaseEnv()
  if (!url || !anonKey) return false

  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(AUTH_CHECK_TIMEOUT_MS)
      : undefined

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      ...(signal ? { signal } : {}),
    })
    return response.ok
  } catch {
    return false
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isMock = process.env.NEXT_PUBLIC_APP_MODE === "mock"

  if (isMock) {
    if (pathname === "/") {
      const url = req.nextUrl.clone()
      url.pathname = "/hoy"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  const { url: supabaseUrl, anonKey } = getSupabaseEnv()
  if (!supabaseUrl || !anonKey) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/auth")) {
    const authed = await isAuthenticated(req)
    if (authed) {
      const url = req.nextUrl.clone()
      url.pathname = "/hoy"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    const authed = await isAuthenticated(req)
    const url = req.nextUrl.clone()
    url.pathname = authed ? "/hoy" : "/auth"
    return NextResponse.redirect(url)
  }

  const authed = await isAuthenticated(req)
  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
}