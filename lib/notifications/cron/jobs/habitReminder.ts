import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import { isInQuietHours, localHourInTimezone, localYmdInTimezone } from "@/lib/notifications/cron/timeHelpers"
import {
  isScheduledOnUtcDay,
  utcTodayIso,
  type HabitMetadataInput,
} from "@/lib/habits/habitMetrics"

export async function runHabitReminders(
  supabase: SupabaseClient,
  userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_habit_reminder) {
    return { sent: false, reason: "disabled" }
  }

  const tz = p.timezone || "America/Bogota"
  const localHour = localHourInTimezone(tz)
  /** Mañana: misma hora que digest para no chocar con check-in nocturno. */
  if (localHour !== p.digest_hour_local) {
    return { sent: false, reason: "wrong_hour" }
  }

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const ymd = localYmdInTimezone(tz)
  const todayIso = utcTodayIso()

  const { data: habits, error } = await supabase
    .from("operational_habits")
    .select("id,name,metadata")
    .eq("user_id", userId)

  if (error || !habits?.length) {
    return { sent: false, reason: "no_habits" }
  }

  const habitIds = habits.map((h) => h.id as string)
  const { data: comps } = await supabase
    .from("habit_completions")
    .select("habit_id,completed_on")
    .eq("user_id", userId)
    .in("habit_id", habitIds)
    .eq("completed_on", todayIso)

  const doneToday = new Set((comps ?? []).map((c) => c.habit_id as string))

  const pending: string[] = []
  for (const h of habits) {
    const meta = h.metadata as HabitMetadataInput | null
    if (!isScheduledOnUtcDay(meta, todayIso)) continue
    if (doneToday.has(h.id as string)) continue
    pending.push(String(h.name))
  }

  if (pending.length === 0) {
    return { sent: false, reason: "all_done" }
  }

  const ok = await tryAcquireCronSend(supabase, userId, "habit_reminder", ymd)
  if (!ok) return { sent: false, reason: "deduped" }

  const preview = pending.slice(0, 4).join(", ")
  const more = pending.length > 4 ? ` (+${pending.length - 4} más)` : ""

  await createNotificationForUser({
    userId,
    title: "Hábitos pendientes hoy",
    body: `Te falta registrar: ${preview}${more}.`,
    category: "habits",
    link: "/habitos",
    metadata: { cron: "habit_reminder", date: ymd, count: pending.length },
  })

  return { sent: true }
}
