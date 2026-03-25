import { createClient } from "@supabase/supabase-js"

export function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""

  if (!url) throw new Error("SUPABASE_URL is not configured")
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

