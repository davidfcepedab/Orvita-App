import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { createServiceClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, fetchGoogleProfile } from "@/lib/integrations/google"

export const runtime = "nodejs"

const STATE_COOKIE = "orvita_google_oauth_state"
const ACCESS_COOKIE = "orvita_google_access_token"

function clearCookies(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 })
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 })
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")

    if (!code || !state) {
      const response = NextResponse.json(
        { success: false, error: "Missing OAuth parameters" },
        { status: 400 }
      )
      clearCookies(response)
      return response
    }

    const cookieState = req.cookies.get(STATE_COOKIE)?.value
    const accessToken = req.cookies.get(ACCESS_COOKIE)?.value

    if (!cookieState || cookieState !== state || !accessToken) {
      const response = NextResponse.json(
        { success: false, error: "Invalid OAuth state" },
        { status: 401 }
      )
      clearCookies(response)
      return response
    }

    const auth = await requireUser(
      new NextRequest(req.url, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    )
    if (auth instanceof NextResponse) {
      const response = NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
      clearCookies(response)
      return response
    }

    const tokens = await exchangeCodeForTokens(code)
    const profile = await fetchGoogleProfile(tokens.access_token)

    const db = createServiceClient()
    const { data: authUserPayload, error: authUserError } = await db.auth.admin.getUserById(auth.userId)

    if (authUserError || !authUserPayload?.user?.email) {
      throw authUserError ?? new Error("No se pudo leer el email de tu cuenta Órvita")
    }

    const sessionEmail = authUserPayload.user.email.trim().toLowerCase()
    const googleEmail = profile.email.trim().toLowerCase()
    if (sessionEmail !== googleEmail) {
      const response = NextResponse.json(
        {
          success: false,
          error:
            "El correo de Google no coincide con tu sesión en Órvita. Usa la misma cuenta o cierra sesión y entra con el email correcto.",
        },
        { status: 403 },
      )
      clearCookies(response)
      return response
    }

    const { data: existingIntegration, error: existingError } = await db
      .from("user_integrations")
      .select("id, refresh_token")
      .eq("user_id", auth.userId)
      .eq("provider", "google")
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    const refreshToken = tokens.refresh_token ?? existingIntegration?.refresh_token
    if (!refreshToken) {
      throw new Error(
        "Google no devolvió refresh token. En Configuración, desvincula Órvita en tu cuenta Google (acceso a apps) y vuelve a conectar con «Conectar Google».",
      )
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await db.from("user_integrations").upsert(
      {
        user_id: auth.userId,
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )

    if (upsertError) {
      throw upsertError
    }

    const redirectUrl = new URL("/configuracion?connected=google", req.url)
    const response = NextResponse.redirect(redirectUrl)
    clearCookies(response)
    return response
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("GOOGLE OAUTH CALLBACK ERROR:", detail)
    const fail = new URL("/configuracion", req.url)
    fail.searchParams.set("google_error", "1")
    fail.searchParams.set("google_error_detail", encodeURIComponent(detail.slice(0, 400)))
    const response = NextResponse.redirect(fail)
    clearCookies(response)
    return response
  }
}
