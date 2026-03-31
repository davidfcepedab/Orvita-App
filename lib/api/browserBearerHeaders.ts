import { isAppMockMode } from "@/lib/checkins/flags"
import { createBrowserClient } from "@/lib/supabase/browser"

/** Evita que la UI quede en “Cargando…” si `getSession()` no resuelve (red/tabs/colgado). */
const GET_SESSION_TIMEOUT_MS = 12_000

export async function browserBearerHeaders(json = false): Promise<HeadersInit> {
  const h: Record<string, string> = {}
  if (json) h["Content-Type"] = "application/json"
  if (isAppMockMode()) return h
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }

  const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), GET_SESSION_TIMEOUT_MS)
  })
  const raced = await Promise.race([sessionPromise, timeoutPromise])
  const token =
    raced && typeof raced === "object" && "data" in raced ? raced.data?.session?.access_token : undefined
  if (token) h.Authorization = `Bearer ${token}`
  return h
}
