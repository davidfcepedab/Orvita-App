"use client"

import { useEffect, useMemo, useState } from "react"
import { isAppMockMode, UI_HEALTH_CONTEXT_ERROR } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { getContext } from "@/lib/getContext"
import {
  HEALTH_ENERGY_PROFILE,
  HEALTH_HYDRATION_TARGET,
  HEALTH_MACRO_TARGETS,
  HEALTH_SUPPLEMENT_STACK,
} from "@/app/data/health/visualSeeds"
import {
  TRAINING_BODY_METRICS,
  TRAINING_MEAL_PLAN,
  TRAINING_MILESTONES,
  TRAINING_WEEKLY_VOLUME,
} from "@/app/data/training/visualSeeds"
import { buildOperationalContext } from "@/lib/operational/context"
import type { AppleHealthContextSignals, Checkin, OperationalContextData } from "@/lib/operational/types"
import type { HealthPreferencesPayload } from "@/lib/health/healthPrefsTypes"
import { goalMlFromHabitMetadata, isWaterTrackingHabit } from "@/lib/habits/waterTrackingHelpers"
import type { HabitMetadata } from "@/lib/operational/types"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function isAppleHealthContextPayload(value: unknown): value is AppleHealthContextSignals {
  if (!value || typeof value !== "object") return false
  const a = value as Record<string, unknown>
  if (typeof a.observed_at !== "string") return false
  if (typeof a.sync_stale !== "boolean") return false
  if (a.source != null && typeof a.source !== "string") return false
  if ("bundle_day_ymd" in a && a.bundle_day_ymd != null && typeof a.bundle_day_ymd !== "string") return false
  for (const key of [
    "sleep_hours",
    "hrv_ms",
    "readiness_score",
    "steps",
    "calories",
    "energy_index",
    "workouts_count",
    "workout_minutes",
    "resting_hr_bpm",
  ] as const) {
    const v = a[key]
    if (v != null && typeof v !== "number") return false
  }
  if ("health_signals" in a) {
    const hs = a.health_signals
    if (hs != null) {
      if (typeof hs !== "object" || Array.isArray(hs)) return false
      for (const v of Object.values(hs as Record<string, unknown>)) {
        if (typeof v !== "number" || !Number.isFinite(v)) return false
      }
    }
  }
  return true
}

function isOperationalContextData(value: unknown): value is OperationalContextData {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  if (typeof o.score_fisico !== "number" || typeof o.score_salud !== "number") return false
  if (typeof o.score_profesional !== "number" || typeof o.score_disciplina !== "number") return false
  if (typeof o.score_recuperacion !== "number") return false
  if (!Array.isArray(o.tendencia_7d)) return false
  if (!Array.isArray(o.today_tasks) || !Array.isArray(o.habits)) return false
  if ("apple_health" in o) {
    const ah = o.apple_health
    if (ah !== null && ah !== undefined && !isAppleHealthContextPayload(ah)) return false
  }
  return o.tendencia_7d.every((item) => {
    if (!item || typeof item !== "object") return false
    const record = item as Record<string, unknown>
    return typeof record.value === "number"
  })
}

/** Mock local: mismo contrato que `/api/context` en producción. */
const MOCK_CHECKINS_DESC: Checkin[] = [
  { id: "m6", score_global: 70, score_fisico: 70, score_salud: 58, score_profesional: 66, created_at: "2026-04-13T08:00:00.000Z" },
  { id: "m5", score_global: 71, score_fisico: 71, score_salud: 62, score_profesional: 67, created_at: "2026-04-14T08:00:00.000Z" },
  { id: "m4", score_global: 69, score_fisico: 72, score_salud: 55, score_profesional: 65, created_at: "2026-04-15T08:00:00.000Z" },
  { id: "m3", score_global: 72, score_fisico: 73, score_salud: 67, score_profesional: 68, created_at: "2026-04-16T08:00:00.000Z" },
  { id: "m2", score_global: 71, score_fisico: 72, score_salud: 63, score_profesional: 68, created_at: "2026-04-17T08:00:00.000Z" },
  { id: "m1", score_global: 73, score_fisico: 73, score_salud: 70, score_profesional: 69, created_at: "2026-04-18T08:00:00.000Z" },
  { id: "m0", score_global: 74, score_fisico: 72, score_salud: 64, score_profesional: 68, created_at: "2026-04-19T08:00:00.000Z" },
].reverse()

const MOCK_CONTEXT: OperationalContextData = buildOperationalContext({
  tasks: [],
  habits: [],
  latestCheckin: MOCK_CHECKINS_DESC[0] ?? null,
  recentCheckinsDesc: MOCK_CHECKINS_DESC,
})

type HabitWaterSnapshot = {
  /** Suma de ml del día para hábitos tipo agua (Misión en /hoy). */
  totalMl: number
  /** Meta en ml del hábito más exigente (si hay varios). */
  goalMl: number
}

export function useSaludContext() {
  const [data, setData] = useState<OperationalContextData | null>(null)
  const [prefs, setPrefs] = useState<HealthPreferencesPayload | null>(null)
  const [habitWater, setHabitWater] = useState<HabitWaterSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (isAppMockMode()) {
        setData(MOCK_CONTEXT)
        setPrefs({})
        setError(null)
        setLoading(false)
        return
      }

      try {
        const authHeaders = await browserBearerHeaders()
        const [response, prefsRes, habitsPayload] = await Promise.all([
          getContext(),
          fetch("/api/health/preferences", { cache: "no-store", headers: authHeaders }).then(async (r) => {
            const j = (await r.json()) as { success?: boolean; preferences?: HealthPreferencesPayload }
            return r.ok && j.success ? j.preferences ?? {} : {}
          }),
          fetch("/api/habits", { cache: "no-store", headers: authHeaders }).then(async (r) => {
            const j = (await r.json()) as {
              success?: boolean
              data?: { habits?: Array<{ water_today_ml?: number; metadata?: HabitMetadata | null }> }
            }
            return r.ok && j.success ? j.data?.habits ?? [] : []
          }),
        ])

        if (!active) return

        setPrefs(prefsRes)

        let totalMl = 0
        let maxGoal = 0
        let sawWaterHabit = false
        for (const h of habitsPayload) {
          const meta = h.metadata ?? undefined
          if (isWaterTrackingHabit(meta)) {
            sawWaterHabit = true
            totalMl += typeof h.water_today_ml === "number" ? h.water_today_ml : 0
            maxGoal = Math.max(maxGoal, goalMlFromHabitMetadata(meta))
          }
        }
        setHabitWater(sawWaterHabit ? { totalMl, goalMl: maxGoal } : null)

        if (!response || !isOperationalContextData(response)) {
          setError(UI_HEALTH_CONTEXT_ERROR)
          setData(null)
          return
        }

        const r = response as OperationalContextData
        const apple_health: AppleHealthContextSignals | null =
          r.apple_health != null && isAppleHealthContextPayload(r.apple_health)
            ? (() => {
                const base = r.apple_health as AppleHealthContextSignals
                const hsRaw = (base as { health_signals?: unknown }).health_signals
                let health_signals: Record<string, number> | null = null
                if (hsRaw != null && typeof hsRaw === "object" && !Array.isArray(hsRaw)) {
                  const acc: Record<string, number> = {}
                  for (const [k, v] of Object.entries(hsRaw as Record<string, unknown>)) {
                    if (typeof v === "number" && Number.isFinite(v)) acc[k] = v
                  }
                  health_signals = Object.keys(acc).length ? acc : null
                }
                return { ...base, health_signals }
              })()
            : null

        setData({ ...r, apple_health })
        setError(null)
      } catch {
        if (active) {
          setError(UI_HEALTH_CONTEXT_ERROR)
          setData(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return useMemo(() => {
    const scoreGlobal = data?.score_global ?? 0
    const scoreFisico = data?.score_fisico ?? 0
    const scoreSalud = data?.score_salud ?? 0
    const scoreProfesional = data?.score_profesional ?? 0
    const scoreDisciplina = data?.score_disciplina ?? scoreProfesional
    const scoreRecuperacion = data?.score_recuperacion ?? scoreSalud
    const deltaDisciplina = data?.delta_disciplina ?? 0
    const deltaRecuperacion = data?.delta_recuperacion ?? 0
    const tendencia = data?.tendencia_7d ?? []

    /** Solo para copy / tarjeta “energía”: combina check-ins reales (no wearable). */
    const narrativeEnergyIndex = clamp(Math.round(scoreSalud * 0.55 + scoreFisico * 0.45), 12, 99)
    const sleepScoreForNarrative = clamp(Math.round(scoreSalud), 0, 100)
    const strain = clamp(Math.round(scoreFisico * 0.82 + scoreDisciplina * 0.18), 20, 95)

    const trendAverage =
      tendencia.length > 0 ? tendencia.reduce((total, item) => total + item.value, 0) / tendencia.length : 0

    const energyAudit = HEALTH_ENERGY_PROFILE.map((item) => ({
      hour: item.hour,
      energy: clamp(narrativeEnergyIndex + item.offset, 10, 96),
      fatigue: clamp(100 - (narrativeEnergyIndex + item.offset), 4, 90),
    }))

    const supplementStack = HEALTH_SUPPLEMENT_STACK.map((item, index) => ({
      ...item,
      taken: index < Math.round(scoreDisciplina / 25),
    }))

    const p = prefs ?? {}
    const targetFromPrefs =
      typeof p.hydrationTargetLiters === "number" && p.hydrationTargetLiters > 0 ? p.hydrationTargetLiters : null
    const targetFromHabitL = habitWater && habitWater.goalMl > 0 ? habitWater.goalMl / 1000 : null
    const hydrationTarget = targetFromPrefs ?? targetFromHabitL ?? HEALTH_HYDRATION_TARGET

    let hydrationCurrent = 0
    let hydrationTracked = false
    if (habitWater) {
      hydrationCurrent = Math.max(0, Number((habitWater.totalMl / 1000).toFixed(2)))
      hydrationTracked = true
    } else if (
      typeof p.hydrationLitersToday === "number" &&
      Number.isFinite(p.hydrationLitersToday) &&
      p.hydrationLitersToday >= 0
    ) {
      hydrationCurrent = Math.max(0, Number(p.hydrationLitersToday.toFixed(2)))
      hydrationTracked = true
    }

    const mg = p.macrosGramsToday
    const macrosFromLog =
      !!mg &&
      typeof mg.protein === "number" &&
      typeof mg.carbs === "number" &&
      typeof mg.fats === "number" &&
      Number.isFinite(mg.protein) &&
      Number.isFinite(mg.carbs) &&
      Number.isFinite(mg.fats)

    const macros = macrosFromLog
      ? [
          { ...HEALTH_MACRO_TARGETS.protein, current: Math.max(0, Math.round(mg!.protein)) },
          { ...HEALTH_MACRO_TARGETS.carbs, current: Math.max(0, Math.round(mg!.carbs)) },
          { ...HEALTH_MACRO_TARGETS.fats, current: Math.max(0, Math.round(mg!.fats)) },
        ]
      : [
          { ...HEALTH_MACRO_TARGETS.protein, current: 0 },
          { ...HEALTH_MACRO_TARGETS.carbs, current: 0 },
          { ...HEALTH_MACRO_TARGETS.fats, current: 0 },
        ]

    const weeklyVolume = TRAINING_WEEKLY_VOLUME.map((item) => ({
      ...item,
      intensity: clamp(item.intensity + Math.round((scoreDisciplina - 70) / 7), 18, 95),
    }))

    const trainingDays = weeklyVolume.filter((item) => item.volume >= 2000).length
    const trainingMinutes = weeklyVolume.reduce((total, item) => total + item.minutes, 0)

    const milestones = TRAINING_MILESTONES.map((item) => ({
      ...item,
      current: item.reverse
        ? Number(Math.max(item.target, item.current - scoreDisciplina / 140).toFixed(1))
        : Number((item.current + scoreFisico / 50).toFixed(1)),
    }))

    const bodyMetrics = TRAINING_BODY_METRICS.map((item, index) => ({
      ...item,
      progress: clamp(40 + scoreFisico / 2 - index * 4, 18, 96),
    }))

    const appleHealth = data?.apple_health ?? null

    return {
      loading,
      error,
      /** Instantánea Apple / `health_metrics` enlazada al mismo contrato que `/api/context`. */
      appleHealth,
      scoreGlobal,
      scoreSalud,
      scoreFisico,
      scoreProfesional,
      scoreDisciplina,
      scoreRecuperacion,
      deltaDisciplina,
      deltaRecuperacion,
      tendencia,
      trendAverage,
      /** @deprecated Evitar en UI nueva; usar scoreSalud. Alias del score de sueño/recuperación en narrativa. */
      sleepScore: sleepScoreForNarrative,
      /** Índice derivado solo de scores de check-in (para copy). */
      bodyBattery: narrativeEnergyIndex,
      /** Datos reales de check-in; no son HRV medido. */
      hrv: Math.round(scoreSalud),
      /** Pulso “reposo” proxy = score físico del check-in (no FC wearable). */
      restingHR: Math.round(scoreFisico),
      strain,
      energyAudit,
      supplementStack,
      hydrationCurrent,
      hydrationTarget,
      hydrationTracked,
      /** true cuando el total de litros viene de hábitos de agua (p. ej. misión en Inicio), no solo de preferencias. */
      hydrationFromHabit: habitWater != null,
      macrosFromLog,
      macros,
      weeklyVolume,
      weeklyMealPlan: TRAINING_MEAL_PLAN,
      milestones,
      bodyMetrics,
      trainingDays,
      trainingMinutes,
    }
  }, [data, error, loading, prefs, habitWater])
}

export type SaludContextSnapshot = ReturnType<typeof useSaludContext>
