import type { SupabaseClient } from "@supabase/supabase-js"

export type OrbitaNotificationPreferences = {
  user_id: string
  push_enabled_global: boolean
  push_checkin_reminder: boolean
  push_habit_reminder: boolean
  push_commitment_reminder: boolean
  push_finance_threshold: boolean
  push_agenda_upcoming: boolean
  push_training_reminder: boolean
  push_digest_morning: boolean
  push_weekly_summary: boolean
  push_partner_activity: boolean
  push_digest_daily: boolean
  finance_savings_threshold_pct: number | null
  reminder_hour_local: number
  digest_hour_local: number
  weekly_digest_dow: number
  timezone: string
  quiet_hours_start: number | null
  quiet_hours_end: number | null
  email_digest_enabled: boolean
  email_weekly_enabled: boolean
  mute_until_palanca: string | null
  mute_until_presion_critica: string | null
  mute_until_energia: string | null
  mute_until_habitos: string | null
  /** 1–4 toques diarios repartidos entre digest_hour_local y reminder_hour_local. */
  habit_reminder_slots: number
  /** Si true, baja toques efectivos cada 7 días de mejor racha (mínimo 1). */
  habit_reminder_auto_ease_on_streak: boolean
  updated_at?: string
}

export const DEFAULT_NOTIFICATION_PREFS: Omit<OrbitaNotificationPreferences, "user_id" | "updated_at"> = {
  push_enabled_global: true,
  push_checkin_reminder: true,
  push_habit_reminder: true,
  push_commitment_reminder: true,
  push_finance_threshold: true,
  push_agenda_upcoming: false,
  push_training_reminder: false,
  push_digest_morning: false,
  push_weekly_summary: false,
  push_partner_activity: false,
  push_digest_daily: false,
  finance_savings_threshold_pct: null,
  reminder_hour_local: 21,
  digest_hour_local: 8,
  weekly_digest_dow: 0,
  timezone: "America/Bogota",
  quiet_hours_start: null,
  quiet_hours_end: null,
  email_digest_enabled: false,
  email_weekly_enabled: false,
  mute_until_palanca: null,
  mute_until_presion_critica: null,
  mute_until_energia: null,
  mute_until_habitos: null,
  habit_reminder_slots: 1,
  habit_reminder_auto_ease_on_streak: true,
}

export function mergePrefs(
  userId: string,
  row: Partial<OrbitaNotificationPreferences> | null,
): OrbitaNotificationPreferences {
  const base = { ...DEFAULT_NOTIFICATION_PREFS, ...(row ?? {}) }
  return { ...base, user_id: userId } as OrbitaNotificationPreferences
}

export async function fetchNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrbitaNotificationPreferences> {
  const { data, error } = await supabase
    .from("orbita_notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.warn("fetchNotificationPrefs:", error.message)
    return mergePrefs(userId, null)
  }

  return mergePrefs(userId, (data ?? null) as Partial<OrbitaNotificationPreferences> | null)
}
