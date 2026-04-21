import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import {
  isInQuietHours,
  localHourInTimezone,
  localWeekdayInTimezone,
  localYmdInTimezone,
} from "@/lib/notifications/cron/timeHelpers"
import { getDigestGreetingFirstName } from "@/lib/email/digestGreeting"
import { morningDigestHtml, weeklyDigestHtml } from "@/lib/email/digestTemplatesHtml"
import { sendOrvitaEmail } from "@/lib/email/sendOrvitaEmail"
import { morningDigestEmail, weeklyDigestEmail } from "@/lib/email/templates"

export async function runMorningDigest(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || (!p.push_digest_morning && !p.push_digest_daily)) {
    return { sent: false, reason: "disabled" }
  }

  const tz = p.timezone || "America/Bogota"
  const localHour = localHourInTimezone(tz)
  if (localHour !== p.digest_hour_local) {
    return { sent: false, reason: "wrong_hour" }
  }

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const ymd = localYmdInTimezone(tz)
  const ok = await tryAcquireCronSend(supabase, userId, "morning_digest", ymd)
  if (!ok) return { sent: false, reason: "deduped" }

  await createNotificationForUser({
    userId,
    title: "Informe de pulso",
    body: "Tu resumen del día: abre Órvita para ver agenda, hábitos, capital y salud.",
    category: "system",
    link: "/inicio",
    metadata: { cron: "morning_digest", date: ymd },
  })

  if (p.email_digest_enabled && email) {
    const greetingFirstName = await getDigestGreetingFirstName(supabase, userId)
    void sendOrvitaEmail({
      to: email,
      subject: "Órvita — Informe de pulso",
      text: morningDigestEmail({ dateLabel: ymd, greetingFirstName }),
      html: morningDigestHtml({ dateYmd: ymd, greetingFirstName }),
    })
  }

  return { sent: true }
}

export async function runWeeklySummary(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_weekly_summary) {
    return { sent: false, reason: "disabled" }
  }

  const tz = p.timezone || "America/Bogota"
  const wd = localWeekdayInTimezone(tz)
  if (wd !== p.weekly_digest_dow) {
    return { sent: false, reason: "wrong_weekday" }
  }

  const localHour = localHourInTimezone(tz)
  if (localHour !== 19) {
    return { sent: false, reason: "wrong_hour" }
  }

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const ymd = localYmdInTimezone(tz)
  const ok = await tryAcquireCronSend(supabase, userId, "weekly_summary", ymd)
  if (!ok) return { sent: false, reason: "deduped" }

  await createNotificationForUser({
    userId,
    title: "Cierre de semana",
    body: "Tu informe de cierre: repasa la semana en Órvita y ajusta la próxima.",
    category: "system",
    link: "/inicio",
    metadata: { cron: "weekly_summary", date: ymd },
  })

  if (p.email_weekly_enabled && email) {
    const greetingFirstName = await getDigestGreetingFirstName(supabase, userId)
    void sendOrvitaEmail({
      to: email,
      subject: "Órvita — Cierre de semana",
      text: weeklyDigestEmail({ dateLabel: ymd, greetingFirstName }),
      html: weeklyDigestHtml({ dateYmd: ymd, greetingFirstName }),
    })
  }

  return { sent: true }
}
