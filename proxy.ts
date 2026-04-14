import { NextRequest, NextResponse } from "next/server"
import { hasUsableOrvitaSessionCookie } from "@/lib/auth/middlewareSession"
import { canonicalHostname } from "@/lib/site/origin"

/**
 * Next.js 16: este archivo (`proxy.ts`) sustituye a `middleware.ts` para la capa Edge.
 * Mantén imports mínimos (solo cookie + JWT exp) para cold start bajo.
 *
 * Auth gate **sin llamadas de red** (no fetch a Supabase en Edge).
 * Evita pantallas en blanco / pestaña cargando si la red a Supabase cuelga.
 * Las rutas `/api/*` validan el token con `requireUser`.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isMock = process.env.NEXT_PUBLIC_APP_MODE === "mock"

  /**
   * Un solo dominio público en producción: orvita.app.
   * Vercel sigue mostrando URLs `*.vercel.app` en el panel; redirigen aquí para usuarios.
   * Previews (`VERCEL_ENV=preview`) no redirigen.
   */
  if (!isMock && process.env.VERCEL_ENV === "production") {
    const rawHost = req.headers.get("host")?.split(":")[0]?.toLowerCase()
    const canon = canonicalHostname()
    if (rawHost && rawHost !== canon) {
      const target = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${canon}`)
      return NextResponse.redirect(target, 308)
    }
  }

  if (isMock) {
    // `/` es el centro de control (Hero + Inicio); no redirigir a `/hoy` para que el mock vea la misma home.
    return NextResponse.next()
  }

  const authed = hasUsableOrvitaSessionCookie(req)

  if (pathname.startsWith("/auth")) {
    if (authed) {
      const url = req.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  /** Resolución de enlaces `orvita://` vía web (`/open?p=…`). Sin sesión: igual entra; la ruta destino aplica auth. */
  if (pathname.startsWith("/open")) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    // Inicio (/) es el centro de control. Si no hay sesión, manda a Auth.
    if (!authed) {
      const url = req.nextUrl.clone()
      url.pathname = "/auth"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
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
