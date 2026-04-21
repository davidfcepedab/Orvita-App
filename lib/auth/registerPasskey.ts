import type { SupabaseClient } from "@supabase/supabase-js"

type WebAuthnRegister = (args: {
  friendlyName: string
  webauthn?: { rpId?: string; rpOrigins?: string[]; signal?: AbortSignal }
}) => Promise<unknown>

type MfaListFactors = () => Promise<{
  data?: {
    all?: Array<{ id: string; factor_type?: string; friendly_name?: string | null; status?: string }>
    totp?: unknown[]
    phone?: unknown[]
  }
  error?: { message?: string } | null
}>

type MfaUnenroll = (args: { factorId: string }) => Promise<{ error?: { message?: string } | null }>

const PASSKEY_ALIAS_KEY = "orvita:passkey:alias:v1"

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

export type OrvitaPasskeyFactor = {
  id: string
  friendlyName: string
  status: string
}

export function getLocalPasskeyAliases(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(PASSKEY_ALIAS_KEY)
    const j = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    return j && typeof j === "object" ? j : {}
  } catch {
    return {}
  }
}

export function setLocalPasskeyAlias(factorId: string, alias: string) {
  if (typeof window === "undefined") return
  const next = { ...getLocalPasskeyAliases() }
  if (alias.trim()) next[factorId] = alias.trim()
  else delete next[factorId]
  window.localStorage.setItem(PASSKEY_ALIAS_KEY, JSON.stringify(next))
}

export async function listOrvitaPasskeys(
  supabase: SupabaseClient,
): Promise<{ ok: true; factors: OrvitaPasskeyFactor[] } | { ok: false; error: string }> {
  try {
    const mfa = (supabase.auth as unknown as { mfa?: { listFactors?: MfaListFactors } }).mfa
    if (!mfa?.listFactors) return { ok: false, error: "Tu cliente no expone mfa.listFactors." }
    const res = await mfa.listFactors()
    if (res.error?.message) return { ok: false, error: res.error.message }
    const all = Array.isArray(res.data?.all) ? res.data!.all : []
    const aliases = getLocalPasskeyAliases()
    const factors = all
      .filter((f) => f && f.factor_type === "webauthn")
      .map((f) => ({
        id: f.id,
        friendlyName: aliases[f.id] || f.friendly_name || "Passkey",
        status: f.status || "unverified",
      }))
    return { ok: true, factors }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo listar passkeys." }
  }
}

export async function removeOrvitaPasskey(
  supabase: SupabaseClient,
  factorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const mfa = (supabase.auth as unknown as { mfa?: { unenroll?: MfaUnenroll } }).mfa
    if (!mfa?.unenroll) return { ok: false, error: "Tu cliente no expone mfa.unenroll." }
    const res = await mfa.unenroll({ factorId })
    if (res.error?.message) return { ok: false, error: res.error.message }
    setLocalPasskeyAlias(factorId, "")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo eliminar passkey." }
  }
}
