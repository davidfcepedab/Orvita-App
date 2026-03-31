import * as jose from "jose"

/**
 * Valida el access token JWT de Supabase **sin red** (firma HS256 + iss + exp).
 * Requiere `SUPABASE_JWT_SECRET` (Dashboard → Project Settings → API → JWT Secret).
 * Si falta el secret o la verificación falla, devuelve `null` para permitir fallback a `getUser()`.
 */
export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<{ sub: string } | null> {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim()
  const baseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "")
  if (!secret || !baseUrl) return null

  const issuer =
    process.env.SUPABASE_JWT_ISSUER?.trim() || `${baseUrl}/auth/v1`

  try {
    const { payload } = await jose.jwtVerify(accessToken, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      issuer,
      clockTolerance: 120,
    })
    const sub = payload.sub
    if (typeof sub !== "string" || !sub) return null
    return { sub }
  } catch {
    return null
  }
}
