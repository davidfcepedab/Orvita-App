import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Primer nombre para saludo en digest (auth metadata o parte del correo).
 * Usa service role en cron.
 */
export async function getDigestGreetingFirstName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user) return null

    const meta = data.user.user_metadata as Record<string, unknown> | undefined
    const full = meta?.full_name ?? meta?.name
    if (typeof full === "string" && full.trim()) {
      const first = full.trim().split(/\s+/)[0]
      if (first && first.length >= 2) {
        return capitalizeWord(first)
      }
    }

    const email = data.user.email
    if (email?.includes("@")) {
      const local = email.split("@")[0] ?? ""
      const segment = local.split(/[._-]/)[0] ?? ""
      if (segment.length >= 2) {
        return capitalizeWord(segment)
      }
    }
  } catch {
    return null
  }
  return null
}

function capitalizeWord(s: string) {
  const t = s.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
