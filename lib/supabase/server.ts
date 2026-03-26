// Exportar createClient como createSupabaseServerClient para compatibilidad
export const createSupabaseServerClient = createClient
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  const url = process.env.SUPABASE_URL?.trim()
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim()

  if (!url) throw new Error("SUPABASE_URL is not configured")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is not configured")

  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

