import { isAppMockMode } from "@/lib/checkins/flags"
import { createBrowserClient } from "@/lib/supabase/browser"

export async function browserBearerHeaders(json = false): Promise<HeadersInit> {
  const h: Record<string, string> = {}
  if (json) h["Content-Type"] = "application/json"
  if (isAppMockMode()) return h
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) h.Authorization = `Bearer ${token}`
  return h
}
