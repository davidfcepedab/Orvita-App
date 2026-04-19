"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode, isSupabaseEnabled, UI_HABITS_SAVE_OFF } from "@/lib/checkins/flags"
import {
  aggregateHabitsSummary,
  addDaysIso,
  computeHabitCompletionMetrics,
  isScheduledOnUtcDay,
  parseBackfillCompletionDay,
  utcTodayIso,
} from "@/lib/habits/habitMetrics"
import { buildSuperhabitStreakCelebration } from "@/lib/habits/streakMilestones"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"
import type { HabitMetadata, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"

export type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"

export type HabitsToggleTodayResult =
  | { ok: true; streakCelebration?: StreakCelebrationPayload | null }
  | { ok: false; error: string }

export type HabitsCompleteAllTodayResult =
  | { ok: true; streakCelebrations?: StreakCelebrationPayload[] }
  | { ok: false; error: string }

async function buildJsonHeaders(): Promise<HeadersInit> {
  const base: HeadersInit = { "Content-Type": "application/json" }
  if (isAppMockMode()) return base
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return base
  return { ...base, Authorization: `Bearer ${token}` }
}

function mockCompletionSeeds(t: string, meta: HabitMetadata, offsets: number[]): string[] {
  const out = new Set<string>()
  for (const o of offsets) {
    const d = addDaysIso(t, o)
    if (d <= t && isScheduledOnUtcDay(meta, d)) out.add(d)
  }
  return Array.from(out).sort()
}

type MockHabitRow = {
  id: string
  name: string
  domain: OperationalDomain
  metadata: HabitMetadata
}

function mockHabitRows(): MockHabitRow[] {
  const m1: HabitMetadata = {
    frequency: "diario",
    weekdays: [1, 2, 3, 4, 5],
    display_days: ["L", "M", "X", "J", "V"],
    is_superhabit: true,
  }
  const m2: HabitMetadata = {
    frequency: "diario",
    weekdays: [1, 2, 3, 4, 5, 6],
    display_days: ["L", "M", "X", "J", "V", "S"],
    is_superhabit: false,
  }
  const m3: HabitMetadata = {
    frequency: "semanal",
    weekdays: [1, 4],
    display_days: ["L", "J"],
    is_superhabit: true,
  }
  return [
    { id: "mock-1", name: "Dormir antes de las 11", domain: "fisico", metadata: m1 },
    { id: "mock-2", name: "Movilidad y respiración", domain: "salud", metadata: m2 },
    { id: "mock-3", name: "Revisión financiera de 10 minutos", domain: "profesional", metadata: m3 },
  ]
}

function initialMockDatesById(t: string): Record<string, string[]> {
  const rows = mockHabitRows()
  return {
    [rows[0].id]: mockCompletionSeeds(t, rows[0].metadata, [-1, -2, -3, -5]),
    [rows[1].id]: mockCompletionSeeds(t, rows[1].metadata, [-1, -2, -4]),
    [rows[2].id]: mockCompletionSeeds(t, rows[2].metadata, [-7, -14, -21]),
  }
}

function buildMockHabitsFromDates(datesById: Record<string, string[]>): HabitWithMetrics[] {
  const t = utcTodayIso()
  return mockHabitRows().map((row) => {
    const dates = datesById[row.id] ?? []
    const metrics = computeHabitCompletionMetrics(dates, t, row.metadata)
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      completed: metrics.completed_today,
      created_at: new Date().toISOString(),
      metadata: row.metadata,
      metrics,
    }
  })
}

export type HabitsSummary = ReturnType<typeof aggregateHabitsSummary>

export function useHabits() {
  const mock = isAppMockMode()
  const persistenceEnabled = isSupabaseEnabled() || mock

  const [habits, setHabits] = useState<HabitWithMetrics[]>([])
  const [summary, setSummary] = useState<HabitsSummary>({
    consistency_30d: 0,
    best_streak: 0,
    at_risk: 0,
    current_streak_max: 0,
  })
  const [loading, setLoading] = useState(!mock)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [backfillingId, setBackfillingId] = useState<string | null>(null)
  const [backfillingAll, setBackfillingAll] = useState(false)
  const mockCompletionDatesRef = useRef<Record<string, string[]>>({})
  const habitsRef = useRef<HabitWithMetrics[]>([])

  useEffect(() => {
    habitsRef.current = habits
  }, [habits])

  const refresh = useCallback(async (): Promise<HabitWithMetrics[] | null> => {
    if (mock) {
      const t = utcTodayIso()
      mockCompletionDatesRef.current = initialMockDatesById(t)
      const seed = buildMockHabitsFromDates(mockCompletionDatesRef.current)
      setHabits(seed)
      habitsRef.current = seed
      setSummary(aggregateHabitsSummary(seed.map((h) => h.metrics)))
      setLoading(false)
      setError(null)
      return seed
    }

    try {
      setLoading(true)
      setError(null)
      const headers = await buildJsonHeaders()
      const res = await fetch("/api/habits", { cache: "no-store", headers })
      const json = (await res.json()) as {
        success?: boolean
        data?: { habits: HabitWithMetrics[]; summary: HabitsSummary }
        error?: string
      }
      if (!res.ok || !json.success || !json.data?.habits) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      setHabits(json.data.habits)
      habitsRef.current = json.data.habits
      setSummary(json.data.summary)
      return json.data.habits
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error cargando hábitos"
      setError(msg)
      setHabits([])
      habitsRef.current = []
      setSummary({
        consistency_30d: 0,
        best_streak: 0,
        at_risk: 0,
        current_streak_max: 0,
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [mock])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleCompleteToday = useCallback(
    async (id: string): Promise<HabitsToggleTodayResult> => {
      if (mock) {
        const today = utcTodayIso()
        const map = mockCompletionDatesRef.current
        const before = habitsRef.current.find((h) => h.id === id)
        const prevStreak = before?.metrics.current_streak ?? 0
        const wasDoneToday = before?.metrics.completed_today ?? false
        const isSuper = Boolean(before?.metadata?.is_superhabit)
        const prevDates = [...(map[id] ?? [])]
        const had = prevDates.includes(today)
        const markingDone = !had
        const nextDates = had ? prevDates.filter((d) => d !== today) : [...prevDates, today].sort()
        map[id] = nextDates

        let streakCelebration: StreakCelebrationPayload | null = null
        if (markingDone && before) {
          const metrics = computeHabitCompletionMetrics(nextDates, today, before.metadata ?? null)
          streakCelebration = buildSuperhabitStreakCelebration({
            habitId: before.id,
            habitName: before.name,
            isSuperhabit: isSuper,
            wasCompletedToday: wasDoneToday,
            nowCompletedToday: metrics.completed_today,
            prevStreak,
            nextStreak: metrics.current_streak,
          })
        }

        setHabits((prev) => {
          const next = prev.map((h) => {
            if (h.id !== id) return h
            const metrics = computeHabitCompletionMetrics(nextDates, today, h.metadata ?? null)
            return { ...h, completed: metrics.completed_today, metrics }
          })
          habitsRef.current = next
          setSummary(aggregateHabitsSummary(next.map((h) => h.metrics)))
          return next
        })
        return { ok: true as const, streakCelebration }
      }

      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }

      const before = habitsRef.current.find((h) => h.id === id)
      const prevStreak = before?.metrics.current_streak ?? 0
      const wasDoneToday = before?.metrics.completed_today ?? false
      const isSuper = Boolean(before?.metadata?.is_superhabit)

      try {
        setTogglingId(id)
        const headers = await buildJsonHeaders()
        const res = await fetch(`/api/habits/${encodeURIComponent(id)}/complete`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          return { ok: false as const, error: messageForHttpError(res.status, json.error, res.statusText) }
        }
        const afterList = await refresh()
        const after = afterList?.find((h) => h.id === id)
        const streakCelebration =
          before && after
            ? buildSuperhabitStreakCelebration({
                habitId: before.id,
                habitName: before.name,
                isSuperhabit: isSuper,
                wasCompletedToday: wasDoneToday,
                nowCompletedToday: after.metrics.completed_today,
                prevStreak,
                nextStreak: after.metrics.current_streak,
              })
            : null
        return { ok: true as const, streakCelebration }
      } catch {
        return { ok: false as const, error: "Error de red" }
      } finally {
        setTogglingId(null)
      }
    },
    [mock, persistenceEnabled, refresh]
  )

  /** Marca o desmarca un día concreto (pasado o hoy), p. ej. si olvidaste registrar o viajaste. */
  const completeOnDay = useCallback(
    async (id: string, completedOnRaw: string) => {
      const parsed = parseBackfillCompletionDay(completedOnRaw)
      if (!parsed.ok) {
        return { ok: false as const, error: parsed.error }
      }

      if (mock) {
        const t = utcTodayIso()
        const map = mockCompletionDatesRef.current
        const prevDates = [...(map[id] ?? [])]
        const had = prevDates.includes(parsed.day)
        const nextDates = had ? prevDates.filter((d) => d !== parsed.day) : [...prevDates, parsed.day].sort()
        map[id] = nextDates
        setHabits((prev) => {
          const next = prev.map((h) => {
            if (h.id !== id) return h
            const metrics = computeHabitCompletionMetrics(nextDates, t, h.metadata ?? null)
            return { ...h, completed: metrics.completed_today, metrics }
          })
          setSummary(aggregateHabitsSummary(next.map((h) => h.metrics)))
          return next
        })
        return { ok: true as const }
      }

      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }

      try {
        setBackfillingId(id)
        const headers = await buildJsonHeaders()
        const res = await fetch(`/api/habits/${encodeURIComponent(id)}/complete`, {
          method: "POST",
          headers,
          body: JSON.stringify({ completedOn: parsed.day }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          return { ok: false as const, error: messageForHttpError(res.status, json.error, res.statusText) }
        }
        await refresh()
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: "Error de red" }
      } finally {
        setBackfillingId(null)
      }
    },
    [mock, persistenceEnabled, refresh],
  )

  /** Marca o desmarca el mismo día en todos los hábitos (un solo refresco al final). */
  const completeAllOnDay = useCallback(
    async (habitIds: string[], completedOnRaw: string) => {
      const parsed = parseBackfillCompletionDay(completedOnRaw)
      if (!parsed.ok) {
        return { ok: false as const, error: parsed.error }
      }

      if (mock) {
        const t = utcTodayIso()
        const map = mockCompletionDatesRef.current
        for (const id of habitIds) {
          const prevDates = [...(map[id] ?? [])]
          const had = prevDates.includes(parsed.day)
          const nextDates = had ? prevDates.filter((d) => d !== parsed.day) : [...prevDates, parsed.day].sort()
          map[id] = nextDates
        }
        setHabits((prev) => {
          const next = prev.map((h) => {
            const dates = map[h.id] ?? []
            const metrics = computeHabitCompletionMetrics(dates, t, h.metadata ?? null)
            return { ...h, completed: metrics.completed_today, metrics }
          })
          setSummary(aggregateHabitsSummary(next.map((h) => h.metrics)))
          return next
        })
        return { ok: true as const }
      }

      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }

      try {
        setBackfillingAll(true)
        const headers = await buildJsonHeaders()
        let firstError: string | undefined
        for (const id of habitIds) {
          try {
            const res = await fetch(`/api/habits/${encodeURIComponent(id)}/complete`, {
              method: "POST",
              headers,
              body: JSON.stringify({ completedOn: parsed.day }),
            })
            const json = (await res.json()) as { success?: boolean; error?: string }
            if (!res.ok || !json.success) {
              firstError ??= messageForHttpError(res.status, json.error, res.statusText)
            }
          } catch {
            firstError ??= "Error de red"
          }
        }
        await refresh()
        if (firstError) return { ok: false as const, error: firstError }
        return { ok: true as const }
      } finally {
        setBackfillingAll(false)
      }
    },
    [mock, persistenceEnabled, refresh],
  )

  /**
   * Marca «hoy» como completado en varios hábitos (POST sin `completedOn` = día civil actual).
   * Pensado para acciones rápidas en Resumen; un solo refresco al final.
   */
  const completeAllScheduledToday = useCallback(
    async (habitIds: string[]): Promise<HabitsCompleteAllTodayResult> => {
      const unique = Array.from(new Set(habitIds.filter(Boolean)))
      if (unique.length === 0) return { ok: true as const, streakCelebrations: [] }

      if (mock) {
        const t = utcTodayIso()
        const map = mockCompletionDatesRef.current
        const snapshots = unique
          .map((habitId) => {
            const h = habitsRef.current.find((x) => x.id === habitId)
            if (!h) return null
            return {
              id: habitId,
              h,
              prevStreak: h.metrics.current_streak,
              wasDone: h.metrics.completed_today,
              isSuper: Boolean(h.metadata?.is_superhabit),
            }
          })
          .filter((row): row is NonNullable<typeof row> => row != null)

        for (const habitId of unique) {
          const prevDates = [...(map[habitId] ?? [])]
          if (!prevDates.includes(t)) map[habitId] = [...prevDates, t].sort()
        }

        const streakCelebrations: StreakCelebrationPayload[] = []
        for (const s of snapshots) {
          const nextDates = map[s.id] ?? []
          const metrics = computeHabitCompletionMetrics(nextDates, t, s.h.metadata ?? null)
          const c = buildSuperhabitStreakCelebration({
            habitId: s.h.id,
            habitName: s.h.name,
            isSuperhabit: s.isSuper,
            wasCompletedToday: s.wasDone,
            nowCompletedToday: metrics.completed_today,
            prevStreak: s.prevStreak,
            nextStreak: metrics.current_streak,
          })
          if (c) streakCelebrations.push(c)
        }

        setHabits((prev) => {
          const next = prev.map((h) => {
            const dates = map[h.id] ?? []
            const metrics = computeHabitCompletionMetrics(dates, t, h.metadata ?? null)
            return { ...h, completed: metrics.completed_today, metrics }
          })
          habitsRef.current = next
          setSummary(aggregateHabitsSummary(next.map((x) => x.metrics)))
          return next
        })
        return { ok: true as const, streakCelebrations }
      }

      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }

      const snapshots = unique
        .map((habitId) => {
          const h = habitsRef.current.find((x) => x.id === habitId)
          if (!h) return null
          return {
            id: habitId,
            name: h.name,
            prevStreak: h.metrics.current_streak,
            wasDone: h.metrics.completed_today,
            isSuper: Boolean(h.metadata?.is_superhabit),
          }
        })
        .filter((row): row is NonNullable<typeof row> => row != null)

      try {
        setBackfillingAll(true)
        const headers = await buildJsonHeaders()
        let firstError: string | undefined
        for (const habitId of unique) {
          try {
            const res = await fetch(`/api/habits/${encodeURIComponent(habitId)}/complete`, {
              method: "POST",
              headers,
              body: JSON.stringify({}),
            })
            const json = (await res.json()) as { success?: boolean; error?: string }
            if (!res.ok || !json.success) {
              firstError ??= messageForHttpError(res.status, json.error, res.statusText)
            }
          } catch {
            firstError ??= "Error de red"
          }
        }
        const afterList = await refresh()
        if (firstError) return { ok: false as const, error: firstError }

        const streakCelebrations: StreakCelebrationPayload[] = []
        if (afterList) {
          for (const s of snapshots) {
            const after = afterList.find((h) => h.id === s.id)
            if (!after) continue
            const c = buildSuperhabitStreakCelebration({
              habitId: s.id,
              habitName: s.name,
              isSuperhabit: s.isSuper,
              wasCompletedToday: s.wasDone,
              nowCompletedToday: after.metrics.completed_today,
              prevStreak: s.prevStreak,
              nextStreak: after.metrics.current_streak,
            })
            if (c) streakCelebrations.push(c)
          }
        }
        return { ok: true as const, streakCelebrations }
      } finally {
        setBackfillingAll(false)
      }
    },
    [mock, persistenceEnabled, refresh],
  )

  const createHabit = useCallback(
    async (input: { name: string; domain: OperationalDomain; metadata: HabitMetadata }) => {
      if (mock) {
        const t = utcTodayIso()
        const meta = { ...input.metadata }
        const hid = `mock-${Date.now()}`
        mockCompletionDatesRef.current[hid] = []
        const metrics = computeHabitCompletionMetrics([], t, meta)
        const next: HabitWithMetrics = {
          id: hid,
          name: input.name.trim(),
          domain: input.domain,
          completed: false,
          created_at: new Date().toISOString(),
          metadata: meta,
          metrics,
        }
        setHabits((prev) => {
          const list = [next, ...prev]
          setSummary(aggregateHabitsSummary(list.map((h) => h.metrics)))
          return list
        })
        return { ok: true as const }
      }
      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }
      try {
        const headers = await buildJsonHeaders()
        const res = await fetch("/api/habits", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: input.name,
            domain: input.domain,
            completed: false,
            metadata: input.metadata,
          }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          return { ok: false as const, error: messageForHttpError(res.status, json.error, res.statusText) }
        }
        await refresh()
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: "Error de red" }
      }
    },
    [mock, persistenceEnabled, refresh]
  )

  const deleteHabit = useCallback(
    async (id: string) => {
      if (mock) {
        setHabits((prev) => {
          const next = prev.filter((h) => h.id !== id)
          delete mockCompletionDatesRef.current[id]
          setSummary(aggregateHabitsSummary(next.map((h) => h.metrics)))
          return next
        })
        return { ok: true as const }
      }
      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }
      try {
        const headers = await buildJsonHeaders()
        const res = await fetch("/api/habits", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ id }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          return { ok: false as const, error: messageForHttpError(res.status, json.error, res.statusText) }
        }
        await refresh()
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: "Error de red" }
      }
    },
    [mock, persistenceEnabled, refresh]
  )

  const updateHabit = useCallback(
    async (
      id: string,
      patch: { name?: string; domain?: OperationalDomain; metadata?: HabitMetadata }
    ) => {
      if (mock) {
        setHabits((prev) => {
          const next = prev.map((h) => {
            if (h.id !== id) return h
            const meta = patch.metadata ?? h.metadata ?? {}
            const t = utcTodayIso()
            const dates = mockCompletionDatesRef.current[h.id] ?? []
            const metrics = computeHabitCompletionMetrics(dates, t, meta)
            return {
              ...h,
              name: patch.name ?? h.name,
              domain: patch.domain ?? h.domain,
              metadata: meta,
              metrics,
            }
          })
          setSummary(aggregateHabitsSummary(next.map((h) => h.metrics)))
          return next
        })
        return { ok: true as const }
      }
      if (!persistenceEnabled) {
        return { ok: false as const, error: UI_HABITS_SAVE_OFF }
      }
      try {
        const headers = await buildJsonHeaders()
        const res = await fetch("/api/habits", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, ...patch }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          return { ok: false as const, error: messageForHttpError(res.status, json.error, res.statusText) }
        }
        await refresh()
        return { ok: true as const }
      } catch {
        return { ok: false as const, error: "Error de red" }
      }
    },
    [mock, persistenceEnabled, refresh]
  )

  const value = useMemo(
    () => ({
      habits,
      summary,
      loading,
      error,
      togglingId,
      backfillingId,
      backfillingAll,
      persistenceEnabled,
      mock,
      refresh,
      toggleCompleteToday,
      completeOnDay,
      completeAllOnDay,
      completeAllScheduledToday,
      createHabit,
      updateHabit,
      deleteHabit,
    }),
    [
      habits,
      summary,
      loading,
      error,
      togglingId,
      backfillingId,
      backfillingAll,
      persistenceEnabled,
      mock,
      refresh,
      toggleCompleteToday,
      completeOnDay,
      completeAllOnDay,
      completeAllScheduledToday,
      createHabit,
      updateHabit,
      deleteHabit,
    ]
  )

  return value
}

