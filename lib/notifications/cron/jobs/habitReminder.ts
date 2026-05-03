import type { SupabaseClient } from "@supabase/supabase-js"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import {
  buildHabitReminderSlotDefs,
  findHabitReminderSlotAtHour,
  habitReminderEffectiveSlotCount,
} from "@/lib/notifications/habitReminderSchedule"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"
import { mergePrefs } from "@/lib/notifications/notificationPrefs"
import { tryAcquireCronSend } from "@/lib/notifications/cron/dedupe"
import { isInQuietHours, localHourInTimezone } from "@/lib/notifications/cron/timeHelpers"
import {
  addDaysIso,
  computeCurrentStreak,
  isScheduledOnUtcDay,
  utcTodayIso,
  type HabitMetadataInput,
} from "@/lib/habits/habitMetrics"
import type { HabitMetadata } from "@/lib/operational/types"
import { goalMlFromHabitMetadata, isWaterTrackingHabit } from "@/lib/habits/waterTrackingHelpers"

/**
 * Curva de consumo esperada al cierre de cada segmento del día (slot 0 → 1/S del objetivo, …).
 * Avisamos si vas por debajo de esa curva (con pequeña holgura) o en el último toque si falta cerrar la meta.
 */
const WATER_SLOT_SLACK_PCT = 5

function waterShouldNotifyThisSlot(
  ml: number,
  goal: number,
  slotOrder: number,
  effectiveSlots: number,
): boolean {
  if (goal <= 0) return false
  const pct = Math.min(100, (ml / goal) * 100)
  if (pct >= 100) return false
  if (effectiveSlots <= 1) return true
  const isLast = slotOrder === effectiveSlots - 1
  if (isLast) return true
  const expectedPct = ((slotOrder + 1) / effectiveSlots) * 100
  return pct < expectedPct - WATER_SLOT_SLACK_PCT
}

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

  if (isInQuietHours(localHour, p.quiet_hours_start, p.quiet_hours_end)) {
    return { sent: false, reason: "quiet" }
  }

  const todayIso = utcTodayIso()
  const streakLookbackStart = addDaysIso(todayIso, -730)

  const { data: habits, error } = await supabase
    .from("operational_habits")
    .select("id,name,metadata")
    .eq("user_id", userId)

  if (error || !habits?.length) {
    return { sent: false, reason: "no_habits" }
  }

  let maxStreakScheduled = 0
  const habitIds = habits.map((h) => h.id as string)
  const { data: comps } = await supabase
    .from("habit_completions")
    .select("habit_id,completed_on,water_ml")
    .eq("user_id", userId)
    .in("habit_id", habitIds)
    .gte("completed_on", streakLookbackStart)

  const byHabit = new Map<string, string[]>()
  const fullyDoneToday = new Set<string>()
  const waterMlToday = new Map<string, number>()
  const habitMetaById = new Map<string, HabitMetadata | null>(
    habits.map((h) => [String(h.id), (h.metadata as HabitMetadata | null) ?? null]),
  )

  for (const c of comps ?? []) {
    const habitId = String(c.habit_id)
    const day = String(c.completed_on).slice(0, 10)
    if (!day) continue
    const arr = byHabit.get(habitId) ?? []
    arr.push(day)
    byHabit.set(habitId, arr)
    if (day !== todayIso) continue
    const meta = habitMetaById.get(habitId) ?? null
    if (isWaterTrackingHabit(meta)) {
      const goal = goalMlFromHabitMetadata(meta)
      const ml = typeof c.water_ml === "number" && Number.isFinite(c.water_ml) ? c.water_ml : 0
      waterMlToday.set(habitId, ml)
      if (ml >= goal) fullyDoneToday.add(habitId)
    } else {
      fullyDoneToday.add(habitId)
    }
  }

  for (const h of habits) {
    const meta = h.metadata as HabitMetadataInput | null
    if (!isScheduledOnUtcDay(meta, todayIso)) continue
    const dates = Array.from(new Set(byHabit.get(String(h.id)) ?? [])).sort()
    const streakDays = computeCurrentStreak(dates, todayIso, meta)
    maxStreakScheduled = Math.max(maxStreakScheduled, streakDays)
  }

  const requestedSlots = p.habit_reminder_slots
  const effectiveSlots = habitReminderEffectiveSlotCount(
    requestedSlots,
    maxStreakScheduled,
    p.habit_reminder_auto_ease_on_streak,
  )

  const slotDefs = buildHabitReminderSlotDefs(p.digest_hour_local, p.reminder_hour_local, effectiveSlots)
  const activeSlot = findHabitReminderSlotAtHour(slotDefs, localHour)
  if (!activeSlot) {
    return { sent: false, reason: "wrong_hour" }
  }

  type PendingEntry = { habitId: string; label: string }
  const pending: PendingEntry[] = []

  for (const h of habits) {
    const meta = h.metadata as HabitMetadataInput | null
    const hid = String(h.id)
    if (!isScheduledOnUtcDay(meta, todayIso)) continue

    const fullMeta = habitMetaById.get(hid) ?? null
    const baseName = String(h.name)

    if (isWaterTrackingHabit(fullMeta)) {
      const goal = goalMlFromHabitMetadata(fullMeta)
      const ml = waterMlToday.get(hid) ?? 0
      if (ml >= goal) continue
      if (!waterShouldNotifyThisSlot(ml, goal, activeSlot.order, effectiveSlots)) continue
      const pct = Math.round((ml / Math.max(1, goal)) * 100)
      pending.push({ habitId: hid, label: `${baseName} (~${pct}% del objetivo)` })
    } else {
      if (fullyDoneToday.has(hid)) continue
      pending.push({ habitId: hid, label: baseName })
    }
  }

  let topPendingStreakHabit: { name: string; days: number } | null = null
  for (const entry of pending) {
    const h = habits.find((x) => String(x.id) === entry.habitId)
    if (!h) continue
    const meta = h.metadata as HabitMetadataInput | null
    const dates = Array.from(new Set(byHabit.get(String(h.id)) ?? [])).sort()
    const streakDays = computeCurrentStreak(dates, todayIso, meta)
    if (streakDays <= 0) continue
    if (!topPendingStreakHabit || streakDays > topPendingStreakHabit.days) {
      topPendingStreakHabit = { name: String(h.name), days: streakDays }
    }
  }

  if (pending.length === 0) {
    return { sent: false, reason: "all_done_or_on_track" }
  }

  const dedupeJob = `habit_reminder_o${activeSlot.order}`
  const ok = await tryAcquireCronSend(supabase, userId, dedupeJob, todayIso)
  if (!ok) return { sent: false, reason: "deduped" }

  const labels = pending.map((e) => e.label)
  const preview = labels.slice(0, 4).join(", ")
  const more = pending.length > 4 ? ` (+${pending.length - 4} más)` : ""
  const streakLead =
    topPendingStreakHabit && topPendingStreakHabit.days >= 2
      ? `Tu racha de ${topPendingStreakHabit.days} días en ${topPendingStreakHabit.name} está en riesgo. `
      : ""

  await createNotificationForUser({
    userId,
    title: topPendingStreakHabit ? "Racha de hábitos en riesgo" : "Hábitos pendientes hoy",
    body: `${streakLead}Te falta registrar: ${preview}${more}.`,
    category: "habits",
    link: "/habitos",
    metadata: {
      cron: "habit_reminder",
      date: todayIso,
      slot_order: activeSlot.order,
      habit_reminder_slots_requested: requestedSlots,
      habit_reminder_slots_effective: effectiveSlots,
      count: pending.length,
      top_streak_days: topPendingStreakHabit?.days ?? 0,
      top_streak_habit: topPendingStreakHabit?.name ?? null,
    },
  })

  return { sent: true }
}
