import type { SupabaseClient } from "@supabase/supabase-js"

type WebAuthnRegister = (args: {
  friendlyName: string
  webauthn?: { rpId?: string; rpOrigins?: string[]; signal?: AbortSignal }
}) => Promise<unknown>

/**
 * Registra un factor WebAuthn (Passkey) vía API experimental de Supabase Auth.
 * Requiere sesión activa y que el proyecto tenga MFA / WebAuthn habilitado.
 */
export async function registerOrvitaPasskey(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return { ok: false, error: "Este dispositivo no admite WebAuthn / passkeys." }
  }

  const webauthn = (supabase.auth as unknown as { webauthn?: { register: WebAuthnRegister } }).webauthn
  if (!webauthn?.register) {
    return { ok: false, error: "Tu cliente de Supabase no expone passkeys. Actualiza @supabase/supabase-js." }
  }

  const friendlyName = `Órvita · ${navigator.userAgent.slice(0, 48)}`
  try {
    const res = (await webauthn.register({
      friendlyName,
      webauthn: {},
    })) as { data?: unknown; error?: { message?: string } | null }

    const err = res && typeof res === "object" && "error" in res ? (res as { error?: { message?: string } }).error : null
    if (err?.message) return { ok: false, error: err.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo registrar el passkey." }
  }
}
