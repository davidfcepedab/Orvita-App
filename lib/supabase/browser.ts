import { createClient } from "@supabase/supabase-js"

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON?.trim() ||
    ""

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")

  return createClient(url, anonKey)
}
