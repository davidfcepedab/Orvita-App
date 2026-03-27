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

    const supabaseAdmin = createServiceClient()
    const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers()

    if (userError) {
      throw userError
    }

    const userData = usersData?.users.find((u) => u.email === profile.email)

    if (!userData) {
      const response = NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
      clearCookies(response)
      return response
    }

    if (userData.id !== auth.userId) {
      const response = NextResponse.json(
        { success: false, error: "Email does not match active session" },
        { status: 403 }
      )
      clearCookies(response)
      return response
    }

    const { data: existingIntegration, error: existingError } = await auth.supabase
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
      throw new Error("Missing Google refresh token")
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await auth.supabase
      .from("user_integrations")
      .upsert(
        {
          user_id: auth.userId,
          provider: "google",
          access_token: tokens.access_token,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
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
    const response = NextResponse.json(
      { success: false, error: "Failed to connect Google" },
      { status: 500 }
    )
    clearCookies(response)
    return response
  }
}
