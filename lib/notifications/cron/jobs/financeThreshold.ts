import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import { isInQuietHours, localHourInTimezone, localYmdInTimezone } from "@/lib/notifications/cron/timeHelpers"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

function currentMonthYmInTz(timeZone: string): string {
  const d = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  if (!y || !m) return d.toISOString().slice(0, 7)
  return `${y}-${m}`
}

export async function runFinanceThresholdScan(
  supabase: SupabaseClient,
  userId: string,
  prefs: OrbitaNotificationPreferences,
): Promise<{ sent: boolean; reason?: string }> {
  const p = mergePrefs(userId, prefs)
  if (!p.push_enabled_global || !p.push_finance_threshold) {
    return { sent: false, reason: "disabled" }
  }

  const threshold = p.finance_savings_threshold_pct
  if (threshold == null || !Number.isFinite(threshold)) {
    return { sent: false, reason: "no_threshold_configured" }
  }

  const tz = p.timezone || "America/Bogota"
  const localHour = localHourInTimezone(tz)
  /** Una vez al día, media tarde */
  if (localHour !== 14) {
    return { sent: false, reason: "wrong_hour" }
  }

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const householdId = await getHouseholdId(supabase, userId)
  if (!householdId) {
    return { sent: false, reason: "no_household" }
  }

  const month = currentMonthYmInTz(tz)
  const bounds = monthBounds(month)
  if (!bounds) return { sent: false, reason: "bad_month" }

  const { startStr, endStr, prevStartStr, prevEndStr } = bounds
  const rangeRows = await getTransactionsByRange(supabase, prevStartStr, endStr, { householdId })
  const currentRows = rangeRows.filter((r) => r.date >= startStr && r.date <= endStr)
  const previousRows = rangeRows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

  const state = await computeFinanceMonthState(supabase, householdId, month, currentRows, previousRows)
  const savingsRate = state.overview.savingsRate

  if (savingsRate >= threshold) {
    return { sent: false, reason: "above_threshold" }
  }

  const ymd = localYmdInTimezone(tz)
  const scopeMonth = `${month}-01`
  const ok = await tryAcquireCronSend(supabase, userId, "finance_threshold", scopeMonth)
  if (!ok) return { sent: false, reason: "deduped" }

  await createNotificationForUser({
    userId,
    title: "Flujo por debajo de tu umbral",
    body: `La tasa de ahorro del mes (~${Math.round(savingsRate)}%) está por debajo del ${threshold}% que marcaste. Revisa gastos operativos o el mapa en Finanzas.`,
    category: "finance",
    link: "/finanzas/overview",
    metadata: { cron: "finance_threshold", month, savingsRate },
  })

  return { sent: true }
}
