import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import { isInQuietHours, localHourInTimezone, localYmdInTimezone } from "@/lib/notifications/cron/timeHelpers"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export async function runCommitmentReminders(
  supabase: SupabaseClient,
  userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_commitment_reminder) {
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

  const householdId = await getHouseholdId(supabase, userId)
  if (!householdId) {
    return { sent: false, reason: "no_household" }
  }

  const ymd = localYmdInTimezone(tz)

  const { data: rows, error } = await supabase
    .from("user_flow_commitments")
    .select("id,title,due_date,amount")
    .eq("household_id", householdId)
    .gte("due_date", ymd)
    .lte("due_date", addDaysYmd(ymd, 3))
    .order("due_date", { ascending: true })
    .limit(12)

  if (error || !rows?.length) {
    return { sent: false, reason: "no_commitments" }
  }

  const ok = await tryAcquireCronSend(supabase, userId, "commitment_reminder", ymd)
  if (!ok) return { sent: false, reason: "deduped" }

  const lines = rows.slice(0, 5).map((r) => {
    const t = String((r as { title?: string }).title ?? "")
    const d = String((r as { due_date?: string }).due_date ?? "")
    return `• ${t} (${d})`
  })
  const more = rows.length > 5 ? `\n…y ${rows.length - 5} más` : ""

  await createNotificationForUser({
    userId,
    title: "Compromisos de flujo próximos",
    body: `En los próximos días:\n${lines.join("\n")}${more}`,
    category: "finance",
    link: "/finanzas/overview",
    metadata: { cron: "commitment_reminder", date: ymd },
  })

  return { sent: true }
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${dt.getFullYear()}-${mm}-${dd}`
}
