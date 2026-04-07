import { createServiceClient } from "@/lib/supabase/server"

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
]

type GoogleIntegrationRecord = {
  id: string
  user_id: string
  provider: string
  access_token: string
  refresh_token: string
  expires_at: string | null
}

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

type GoogleProfile = {
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
  sub?: string
}

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim()

  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured")
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET is not configured")
  if (!redirectUri) throw new Error("GOOGLE_REDIRECT_URI is not configured")

  return { clientId, clientSecret, redirectUri }
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleEnv()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google token exchange failed: ${detail}`)
  }

  const payload = (await response.json()) as GoogleTokenResponse
  if (!payload.access_token || !payload.expires_in) {
    throw new Error("Google token response missing required fields")
  }

  return payload
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google profile fetch failed: ${detail}`)
  }

  const payload = (await response.json()) as GoogleProfile
  if (!payload.email) {
    throw new Error("Google profile missing email")
  }

  return payload
}

export async function refreshAccessTokenIfNeeded(
  integration: GoogleIntegrationRecord
): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error("Google refresh token missing")
  }

  const expiresAt = integration.expires_at ? Date.parse(integration.expires_at) : null
  const now = Date.now()
  if (expiresAt && expiresAt - now > 60_000) {
    return integration.access_token
  }

  const { clientId, clientSecret } = getGoogleEnv()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: integration.refresh_token,
    grant_type: "refresh_token",
  })

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google refresh failed: ${detail}`)
  }

  const payload = (await response.json()) as GoogleTokenResponse
  if (!payload.access_token || !payload.expires_in) {
    throw new Error("Google refresh response missing required fields")
  }

  const nextExpiresAt = new Date(Date.now() + payload.expires_in * 1000).toISOString()
  const supabaseAdmin = createServiceClient()

  const { error } = await supabaseAdmin
    .from("user_integrations")
    .update({
      access_token: payload.access_token,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id)

  if (error) {
    throw new Error(error.message)
  }

  return payload.access_token
}

/**
 * Mensajes breves para UI cuando falla el sync (no exponer cuerpos JSON de Google).
 */
export function mapGoogleSyncErrorToUserMessage(context: "calendar" | "tasks", detail: string): string {
  const d = detail.toLowerCase()
  if (d.includes("refresh token missing") || d.includes("invalid_grant") || d.includes("google refresh failed")) {
    return "La conexión con Google caducó o fue revocada. Vuelve a conectar Google en Configuración."
  }
  if (d.includes("google integration not found") || d.includes("integration not found")) {
    return "No hay cuenta de Google vinculada. Usa «Conectar Google» primero."
  }
  if (d.includes("401") || d.includes("unauthorized")) {
    return "Google no autorizó la operación. Vuelve a conectar tu cuenta."
  }
  if (d.includes("ratelimit") || d.includes("rate limit") || d.includes("quota") || d.includes("rate_limit_exceeded")) {
    return "Google limitó temporalmente las peticiones (cuota por minuto). Espera 1–2 minutos y evita abrir varias pestañas de Órvita a la vez."
  }
  if (d.includes("403") || d.includes("forbidden")) {
    return context === "calendar"
      ? "Google Calendar no permitió el acceso. Comprueba permisos del calendario."
      : "Google Tasks no permitió el acceso."
  }
  if (d.includes(" 400:") || d.includes("bad request") || d.includes("badrequest")) {
    return context === "calendar"
      ? "Google rechazó la consulta al calendario (solicitud inválida). Prueba de nuevo o vuelve a conectar Google."
      : "Google rechazó la consulta de tareas. Prueba de nuevo o vuelve a conectar Google."
  }
  if (d.includes("not found") || d.includes("notfound")) {
    return "No se encontró el recurso en Google (calendario o lista). Revisa tu cuenta de Google."
  }
  if (d.includes("row-level security") || d.includes("rls policy")) {
    return "No se pudo guardar en la base de datos. Aplica la migración de Google en Supabase o revisa políticas RLS."
  }
  if (d.includes("does not exist") || d.includes("pgrst") || d.includes("schema cache")) {
    return "Falta una tabla en la base de datos. Ejecuta las migraciones de integración Google en Supabase."
  }
  if (d.includes("duplicate key") || d.includes("unique constraint")) {
    return "Conflicto al guardar eventos duplicados. Vuelve a sincronizar; si sigue fallando, contacta soporte."
  }
  return context === "calendar"
    ? "No se pudo sincronizar el calendario. Vuelve a conectar Google en Configuración o revisa los logs del servidor."
    : "No se pudo sincronizar las tareas. Vuelve a conectar Google en Configuración o revisa los logs del servidor."
}

export type { GoogleIntegrationRecord, GoogleProfile, GoogleTokenResponse }
