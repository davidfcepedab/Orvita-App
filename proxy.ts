import { NextRequest, NextResponse } from "next/server"
import { hasUsableOrvitaSessionCookie } from "@/lib/auth/middlewareSession"

/**
 * Auth gate **sin llamadas de red** (no fetch a Supabase en Edge).
 * Evita pantallas en blanco / pestaña cargando si la red a Supabase cuelga.
 * Las rutas `/api/*` validan el token con `requireUser`.
 */
export default function proxy(req: NextRequest) {
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

  const authed = hasUsableOrvitaSessionCookie(req)

  if (pathname.startsWith("/auth")) {
    if (authed) {
      const url = req.nextUrl.clone()
      url.pathname = "/hoy"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone()
    url.pathname = authed ? "/hoy" : "/auth"
    return NextResponse.redirect(url)
  }

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
