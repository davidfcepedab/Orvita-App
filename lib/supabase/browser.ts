import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

export function createBrowserClient(): SupabaseClient {
  const isMock = process.env.NEXT_PUBLIC_APP_MODE === "mock"
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (isMock) {
    return {
      auth: {
        async signInWithPassword() {
          return {
            data: {
              session: {
                access_token: "mock-access-token",
              },
            },
            error: null,
          }
        },
        async getUser() {
          return {
            data: {
              user: {
                user_metadata: {
                  full_name: "Demo User",
                  name: "Demo User",
                },
                email: "demo@local.test",
              },
            },
            error: null,
          }
        },
        async updateUser(attrs: { data?: Record<string, unknown> }) {
          const nextName =
            typeof attrs.data?.full_name === "string"
              ? attrs.data.full_name
              : typeof attrs.data?.name === "string"
                ? attrs.data.name
                : "Demo User"
          return {
            data: {
              user: {
                user_metadata: {
                  full_name: nextName,
                  name: nextName,
                },
                email: "demo@local.test",
              },
            },
            error: null,
          }
        },
        async signOut() {
          return { error: null }
        },
        async getSession() {
          return {
            data: {
              session: {
                access_token: "mock-access-token",
              },
            },
            error: null,
          }
        },
        async signInWithOAuth() {
          return {
            data: { provider: "apple" as const, url: null },
            error: new Error("OAuth no disponible en modo demo"),
          }
        },
      },
    } as unknown as SupabaseClient
  }

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")

  if (!browserClient) {
    browserClient = createClient(url, anonKey)
  }

  return browserClient
}
