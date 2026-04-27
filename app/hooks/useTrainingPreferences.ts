"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { defaultBodyMetricRows, defaultMealPlan, emptyBodyMetricRows, emptyMealPlan } from "@/lib/training/defaultTrainingDisplay"
import type { BodyMetricDisplayRow, MealDayDisplay, TrainingPreferencesPayload, VisualGoalMode } from "@/lib/training/trainingPrefsTypes"
import { defaultVisualGoalMode } from "@/lib/training/visualGoalModeLabels"

const PREFS_KEY = "orbita:training:prefs:v1"
const LEGACY_GOAL_KEY = "orbita:training:goal-image"

const VISUAL_GOAL_MODES = new Set<VisualGoalMode>([
  "recomposicion",
  "bajar_medidas",
  "hipertrofia_magra",
  "definicion",
  "mantenimiento",
])

function isVisualGoalMode(v: unknown): v is VisualGoalMode {
  return typeof v === "string" && VISUAL_GOAL_MODES.has(v as VisualGoalMode)
}

function buildDefaults(): TrainingPreferencesPayload {
  if (isAppMockMode()) {
    return {
      bodyMetrics: defaultBodyMetricRows(),
      mealPlan: defaultMealPlan(),
      mealNotes: "",
      visualGoalDescription:
        "Cuerpo atlético con 12% grasa, hombros y brazos marcados, postura fuerte y energía sostenida todo el día.",
      visualGoalDeadlineYm: "2026-10",
      visualGoalPriority: "alta",
      visualGoalMode: "hipertrofia_magra",
    }
  }
  return {
    bodyMetrics: emptyBodyMetricRows(),
    mealPlan: emptyMealPlan(),
    mealNotes: "",
    visualGoalDescription: "",
    visualGoalDeadlineYm: "",
    visualGoalPriority: "alta",
    visualGoalMode: defaultVisualGoalMode(),
  }
}

function readLocalPrefs(): TrainingPreferencesPayload {
  const defaults = buildDefaults()
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREFS_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingPreferencesPayload
      return {
        ...defaults,
        ...parsed,
        bodyMetrics: Array.isArray(parsed.bodyMetrics) ? parsed.bodyMetrics : defaults.bodyMetrics,
        mealPlan: Array.isArray(parsed.mealPlan) ? parsed.mealPlan : defaults.mealPlan,
        mealNotes: typeof parsed.mealNotes === "string" ? parsed.mealNotes : defaults.mealNotes ?? "",
        visualGoalDescription:
          typeof parsed.visualGoalDescription === "string"
            ? parsed.visualGoalDescription
            : defaults.visualGoalDescription,
        visualGoalDeadlineYm:
          typeof parsed.visualGoalDeadlineYm === "string" ? parsed.visualGoalDeadlineYm : defaults.visualGoalDeadlineYm,
        visualGoalPriority: parsed.visualGoalPriority ?? defaults.visualGoalPriority,
        visualGoalMode: isVisualGoalMode(parsed.visualGoalMode) ? parsed.visualGoalMode : defaults.visualGoalMode,
      }
    }
  } catch {
    /* ignore */
  }
  const legacyGoal = typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_GOAL_KEY) : null
  return legacyGoal ? { ...defaults, goalImageUrl: legacyGoal } : defaults
}

function writeLocalPrefs(p: TrainingPreferencesPayload) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p))
    if (p.goalImageUrl) {
      window.localStorage.setItem(LEGACY_GOAL_KEY, p.goalImageUrl)
    }
  } catch {
    /* ignore */
  }
}

async function buildAuthHeaders(): Promise<HeadersInit> {
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

export function useTrainingPreferences() {
  const mock = isAppMockMode()
  const remote = isSupabaseEnabled() && !mock
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [prefs, setPrefsState] = useState<TrainingPreferencesPayload>(() => buildDefaults())
  const [loading, setLoading] = useState(remote)
  const [error, setError] = useState<string | null>(null)

  const setPrefs = useCallback((next: TrainingPreferencesPayload) => {
    setPrefsState(next)
    if (typeof window !== "undefined") {
      writeLocalPrefs(next)
    }
  }, [])

  const mergeRemote = useCallback(async () => {
    if (!remote) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const headers = await buildAuthHeaders()
      const res = await fetch("/api/training/preferences", { cache: "no-store", headers })
      const payload = (await res.json()) as {
        success?: boolean
        preferences?: TrainingPreferencesPayload
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const server = payload.preferences ?? {}
      const local = readLocalPrefs()
      const defaults = buildDefaults()
      const merged: TrainingPreferencesPayload = {
        ...defaults,
        ...local,
        ...server,
        bodyMetrics: Array.isArray(server.bodyMetrics) ? server.bodyMetrics : local.bodyMetrics ?? defaults.bodyMetrics,
        mealPlan: Array.isArray(server.mealPlan) ? server.mealPlan : local.mealPlan ?? defaults.mealPlan,
        mealNotes: typeof server.mealNotes === "string" ? server.mealNotes : local.mealNotes ?? "",
        goalImageUrl: server.goalImageUrl ?? local.goalImageUrl,
        visualGoalDescription:
          typeof server.visualGoalDescription === "string"
            ? server.visualGoalDescription
            : local.visualGoalDescription ?? defaults.visualGoalDescription,
        visualGoalDeadlineYm:
          typeof server.visualGoalDeadlineYm === "string"
            ? server.visualGoalDeadlineYm
            : local.visualGoalDeadlineYm ?? defaults.visualGoalDeadlineYm,
        visualGoalPriority: server.visualGoalPriority ?? local.visualGoalPriority ?? defaults.visualGoalPriority,
        visualGoalMode:
          server.visualGoalMode && isVisualGoalMode(server.visualGoalMode)
            ? server.visualGoalMode
            : local.visualGoalMode ?? defaults.visualGoalMode,
      }
      setPrefsState(merged)
      writeLocalPrefs(merged)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de preferencias"
      setError(msg)
      setPrefsState(readLocalPrefs())
    } finally {
      setLoading(false)
    }
  }, [remote])

  useEffect(() => {
    if (mock || !remote) {
      setPrefsState(readLocalPrefs())
      setLoading(false)
      return
    }
    void mergeRemote()
  }, [mock, remote, mergeRemote])

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    }
  }, [])

  const pushRemote = useCallback(
    async (patch: TrainingPreferencesPayload) => {
      if (!remote) return
      try {
        const headers = await buildAuthHeaders()
        const res = await fetch("/api/training/preferences", {
          method: "POST",
          headers,
          body: JSON.stringify(patch),
        })
        const payload = (await res.json()) as {
          success?: boolean
          preferences?: TrainingPreferencesPayload
          error?: string
        }
        if (!res.ok || !payload.success) {
          setError(messageForHttpError(res.status, payload.error, res.statusText))
          return
        }
        if (payload.preferences) {
          setPrefsState((prev) => {
            const next = { ...prev, ...payload.preferences }
            writeLocalPrefs(next)
            return next
          })
        }
      } catch {
        /* keep local */
      }
    },
    [remote],
  )

  const updatePrefs = useCallback(
    (patch: Partial<TrainingPreferencesPayload>) => {
      setPrefsState((prev) => {
        const next: TrainingPreferencesPayload = { ...prev, ...patch }
        writeLocalPrefs(next)
        if (remote) {
          const keys = Object.keys(patch)
          const onlyNotes = keys.length === 1 && keys[0] === "mealNotes"
          if (onlyNotes && patch.mealNotes !== undefined) {
            if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
            const value = patch.mealNotes
            notesDebounceRef.current = setTimeout(() => {
              void pushRemote({ mealNotes: value })
            }, 650)
          } else {
            void pushRemote(patch)
          }
        }
        return next
      })
    },
    [remote, pushRemote],
  )

  const setGoalImageUrl = useCallback(
    (goalImageUrl: string) => {
      updatePrefs({ goalImageUrl })
    },
    [updatePrefs],
  )

  const setMealPlan = useCallback(
    (mealPlan: MealDayDisplay[]) => {
      updatePrefs({ mealPlan })
    },
    [updatePrefs],
  )

  const setBodyMetrics = useCallback(
    (bodyMetrics: BodyMetricDisplayRow[]) => {
      updatePrefs({ bodyMetrics })
    },
    [updatePrefs],
  )

  const setMealNotes = useCallback(
    (mealNotes: string) => {
      updatePrefs({ mealNotes })
    },
    [updatePrefs],
  )

  const bodyRows = useMemo(() => {
    if (mock) {
      return prefs.bodyMetrics && prefs.bodyMetrics.length > 0 ? prefs.bodyMetrics : defaultBodyMetricRows()
    }
    return prefs.bodyMetrics ?? emptyBodyMetricRows()
  }, [mock, prefs.bodyMetrics])

  const mealDays = useMemo(() => {
    if (mock) {
      return prefs.mealPlan && prefs.mealPlan.length > 0 ? prefs.mealPlan : defaultMealPlan()
    }
    return prefs.mealPlan ?? emptyMealPlan()
  }, [mock, prefs.mealPlan])

  return {
    prefs,
    bodyRows,
    mealDays,
    loading,
    error,
    setGoalImageUrl,
    setMealPlan,
    setBodyMetrics,
    setMealNotes,
    updatePrefs,
    refreshRemote: mergeRemote,
  }
}
