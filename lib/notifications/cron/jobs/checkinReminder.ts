import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import { isInQuietHours, localHourInTimezone, localYmdInTimezone } from "@/lib/notifications/cron/timeHelpers"

async function hasCheckinForLocalDay(
  supabase: SupabaseClient,
  userId: string,
  localYmd: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("checkins")
    .select("id,body_metrics,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error || !data?.length) return false

  for (const row of data) {
    const bm = row.body_metrics as { fecha_reportada?: string } | null
    const fr = bm?.fecha_reportada?.slice(0, 10)
    if (fr && fr === localYmd) return true
  }

  const { data: fallback } = await supabase
    .from("checkins")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", `${localYmd}T00:00:00.000Z`)
    .lt("created_at", `${localYmd}T23:59:59.999Z`)
    .limit(1)

  return (fallback?.length ?? 0) > 0
}

export async function runCheckinReminders(
  supabase: SupabaseClient,
  userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_checkin_reminder) {
    return { sent: false, reason: "disabled" }
  }

  const tz = p.timezone || "America/Bogota"
  const localHour = localHourInTimezone(tz)
  if (localHour !== p.reminder_hour_local) {
    return { sent: false, reason: "wrong_hour" }
  }

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const ymd = localYmdInTimezone(tz)

  const has = await hasCheckinForLocalDay(supabase, userId, ymd)
  if (has) {
    return { sent: false, reason: "already_checked_in" }
  }

  const ok = await tryAcquireCronSend(supabase, userId, "checkin_reminder", ymd)
  if (!ok) return { sent: false, reason: "deduped" }

  await createNotificationForUser({
    userId,
    title: "Check-in pendiente",
    body: "Aún no registras tu día en Órvita. Un minuto basta para cerrar el pulso.",
    category: "checkin",
    link: "/checkin",
    metadata: { cron: "checkin_reminder", date: ymd },
  })

  return { sent: true }
}
