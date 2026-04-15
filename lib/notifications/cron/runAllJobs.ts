import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchNotificationPrefs, mergePrefs, type OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { runCheckinReminders } from "@/lib/notifications/cron/jobs/checkinReminder"
import { runHabitReminders } from "@/lib/notifications/cron/jobs/habitReminder"
import { runCommitmentReminders } from "@/lib/notifications/cron/jobs/commitmentReminder"
import { runFinanceThresholdScan } from "@/lib/notifications/cron/jobs/financeThreshold"
import { runMorningDigest, runWeeklySummary } from "@/lib/notifications/cron/jobs/digests"
import {
  runAgendaUpcomingStub,
  runPartnerActivityStub,
  runTrainingReminderStub,
} from "@/lib/notifications/cron/jobs/stubs"

export type CronJobName =
  | "checkin"
  | "habits"
  | "commitments"
  | "finance"
  | "morning"
  | "weekly"
  | "agenda"
  | "training"
  | "partner"
  | "all"

const ALL_JOBS: Exclude<CronJobName, "all">[] = [
  "checkin",
  "habits",
  "commitments",
  "finance",
  "morning",
  "weekly",
  "agenda",
  "training",
  "partner",
]

export type CronSummary = {
  users: number
  sent: Partial<Record<Exclude<CronJobName, "all">, number>>
  errors: string[]
}

export async function runNotificationCron(
  supabase: SupabaseClient,
  jobs: CronJobName[],
): Promise<CronSummary> {
  const want = jobs.includes("all") ? ALL_JOBS : jobs.filter((j): j is Exclude<CronJobName, "all"> => j !== "all")

  const sent: CronSummary["sent"] = {}
  const errors: string[] = []
  const userRows = await listUsersWithEmail(supabase)

  for (const { id: userId, email } of userRows) {
    let prefs: OrbitaNotificationPreferences
    try {
      prefs = await fetchNotificationPrefs(supabase, userId)
    } catch {
      prefs = mergePrefs(userId, null)
    }

    for (const job of want) {
      try {
        const did = await dispatchOneJob(supabase, userId, email, prefs, job)
        if (did) {
          sent[job] = (sent[job] ?? 0) + 1
        }
      } catch (e) {
        errors.push(`${job} ${userId.slice(0, 8)}: ${e instanceof Error ? e.message : "error"}`)
      }
    }
  }

  return { users: userRows.length, sent, errors }
}

async function listUsersWithEmail(
  supabase: SupabaseClient,
): Promise<{ id: string; email: string | null }[]> {
  const out: { id: string; email: string | null }[] = []
  let from = 0
  const page = 500
  for (;;) {
    const { data, error } = await supabase.from("users").select("id,email").range(from, from + page - 1)
    if (error) {
      console.error("listUsersWithEmail:", error.message)
      break
    }
    const batch = data ?? []
    if (batch.length === 0) break
    for (const row of batch) {
      out.push({ id: row.id as string, email: (row.email as string | null) ?? null })
    }
    if (batch.length < page) break
    from += page
  }
  return out
}

async function dispatchOneJob(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  prefs: OrbitaNotificationPreferences,
  job: Exclude<CronJobName, "all">,
): Promise<boolean> {
  switch (job) {
    case "checkin":
      return (await runCheckinReminders(supabase, userId, prefs)).sent === true
    case "habits":
      return (await runHabitReminders(supabase, userId, prefs)).sent === true
    case "commitments":
      return (await runCommitmentReminders(supabase, userId, prefs)).sent === true
    case "finance":
      return (await runFinanceThresholdScan(supabase, userId, prefs)).sent === true
    case "morning":
      return (await runMorningDigest(supabase, userId, email, prefs)).sent === true
    case "weekly":
      return (await runWeeklySummary(supabase, userId, email, prefs)).sent === true
    case "agenda":
      return (await runAgendaUpcomingStub(supabase, userId, prefs)).sent === true
    case "training":
      return (await runTrainingReminderStub(supabase, userId, prefs)).sent === true
    case "partner":
      return (await runPartnerActivityStub(supabase, userId, prefs)).sent === true
    default:
      return false
  }
}
