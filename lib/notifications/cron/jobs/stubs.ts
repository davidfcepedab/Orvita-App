import type { SupabaseClient } from "@supabase/supabase-js"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { localHourInTimezone } from "@/lib/notifications/cron/timeHelpers"

/** Google Calendar en servidor + tokens: pendiente de integrar. */
export async function runAgendaUpcomingStub(
  _supabase: SupabaseClient,
  _userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason: string }> {
  const p = mergePrefs(_userId, prefs)
  if (!p.push_enabled_global || !p.push_agenda_upcoming) {
    return { sent: false, reason: "disabled" }
  }
  return { sent: false, reason: "not_implemented_needs_google" }
}

/** Preferencias en users.training_preferences — aviso genérico opcional. */
export async function runTrainingReminderStub(
  supabase: SupabaseClient,
  userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_training_reminder) {
    return { sent: false, reason: "disabled" }
  }

  const tz = p.timezone || "America/Bogota"
  if (localHourInTimezone(tz) !== 18) {
    return { sent: false, reason: "wrong_hour" }
  }

  const { data: row } = await supabase.from("users").select("training_preferences").eq("id", userId).maybeSingle()
  const tp = row?.training_preferences as Record<string, unknown> | null
  if (!tp || typeof tp !== "object" || Object.keys(tp).length === 0) {
    return { sent: false, reason: "no_training_prefs" }
  }

  return { sent: false, reason: "not_implemented_extend_prefs" }
}

/** Hogar compartido / pareja: sin eventos en API aún. */
export async function runPartnerActivityStub(
  _supabase: SupabaseClient,
  _userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason: string }> {
  const p = mergePrefs(_userId, prefs)
  if (!p.push_enabled_global || !p.push_partner_activity) {
    return { sent: false, reason: "disabled" }
  }
  return { sent: false, reason: "not_implemented" }
}
