import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode } from "@/lib/checkins/flags"

type ContextEnvelope = {
  success?: boolean
  data?: unknown
  error?: string
}

function isContextEnvelope(value: unknown): value is ContextEnvelope {
  return !!value && typeof value === "object"
}

async function contextFetchHeaders(): Promise<HeadersInit> {
  if (isAppMockMode()) return {}
  try {
    const supabase = createBrowserClient() as {
      auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
    }
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export async function getContext(): Promise<unknown | null> {
  try {
    const headers = await contextFetchHeaders()
    const res = await fetch("/api/context", {
      cache: "no-store",
      headers,
    })

    if (!res.ok) {
      console.error("Context API error:", res.status)
      return null
    }

    const payload = (await res.json()) as unknown

    if (isContextEnvelope(payload)) {
      if (payload.success && payload.data) {
        return payload.data
      }
      if (payload.success === false) {
        return null
      }
    }

    return payload
  } catch (error) {
    console.error("Error cargando contexto:", error)
    return null
  }
}
