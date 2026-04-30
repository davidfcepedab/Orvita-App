import type { SupabaseClient } from "@supabase/supabase-js"
import type { HealthPreferencesPayload } from "@/lib/health/healthPrefsTypes"

function parsePrefs(raw: unknown): HealthPreferencesPayload {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as HealthPreferencesPayload
  return {}
}

/** Marca en `users.health_preferences` que este usuario ya enlazó Hevy vía Órvita (solo si aún no hay fecha). */
export async function ensureHevyUserLinkedPreference(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: row, error: readErr } = await supabase
    .from("users")
    .select("health_preferences")
    .eq("id", userId)
    .maybeSingle()

  if (readErr) return

  const prev = parsePrefs(row?.health_preferences)
  if (typeof prev.hevyLinkedAt === "string" && prev.hevyLinkedAt.trim().length > 0) return

  const next: HealthPreferencesPayload = { ...prev, hevyLinkedAt: new Date().toISOString() }
  const { error: writeErr } = await supabase.from("users").update({ health_preferences: next }).eq("id", userId)
  if (writeErr) console.error("ensureHevyUserLinkedPreference:", writeErr.message)
}

export function hevyLinkedAtFromPreferences(prefs: HealthPreferencesPayload): string | null {
  const v = prefs.hevyLinkedAt
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length ? t : null
}
