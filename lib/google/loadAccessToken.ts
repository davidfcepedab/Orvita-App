import type { SupabaseClient } from "@supabase/supabase-js"
import { refreshAccessTokenIfNeeded, type GoogleIntegrationRecord } from "@/lib/integrations/google"
import { createServiceClient } from "@/lib/supabase/server"

export async function getGoogleAccessTokenForUser(
  _supabase: SupabaseClient,
  userId: string,
): Promise<{ token: string } | { error: string; status: number }> {
  const db = createServiceClient()
  const { data: integration, error } = await db
    .from("user_integrations")
    .select("id, user_id, provider, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle()

  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Google integration not found", status: 404 }

  try {
    const token = await refreshAccessTokenIfNeeded(integration as GoogleIntegrationRecord)
    return { token }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Token refresh failed", status: 500 }
  }
}
