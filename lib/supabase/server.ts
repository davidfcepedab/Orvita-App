import { createClient as createSupabaseClient } from "@supabase/supabase-js"

type CreateClientOptions = {
  accessToken?: string
}

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim()
  )
}

function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim()
  )
}

// Exportar createClient como createSupabaseServerClient para compatibilidad
export const createSupabaseServerClient = createClient

export function createClient(options?: CreateClientOptions) {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")

  return createSupabaseClient(url, anonKey, {
    global: options?.accessToken
      ? { headers: { Authorization: `Bearer ${options.accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function createServiceClient() {
  const url = getSupabaseUrl()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
