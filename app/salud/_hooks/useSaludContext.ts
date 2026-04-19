"use client"

import { useEffect, useMemo, useState } from "react"
import { isAppMockMode, UI_HEALTH_CONTEXT_ERROR } from "@/lib/checkins/flags"
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
import type { Checkin, OperationalContextData } from "@/lib/operational/types"
import type { HealthPreferencesPayload } from "@/lib/health/healthPrefsTypes"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function isOperationalContextData(value: unknown): value is OperationalContextData {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  if (typeof o.score_fisico !== "number" || typeof o.score_salud !== "number") return false
  if (typeof o.score_profesional !== "number" || typeof o.score_disciplina !== "number") return false
  if (typeof o.score_recuperacion !== "number") return false
  if (!Array.isArray(o.tendencia_7d)) return false
  if (!Array.isArray(o.today_tasks) || !Array.isArray(o.habits)) return false
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

export function useSaludContext() {
  const [data, setData] = useState<OperationalContextData | null>(null)
  const [prefs, setPrefs] = useState<HealthPreferencesPayload | null>(null)
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
        const [response, prefsRes] = await Promise.all([
          getContext(),
          fetch("/api/health/preferences", { cache: "no-store", credentials: "include" }).then(async (r) => {
            const j = (await r.json()) as { success?: boolean; preferences?: HealthPreferencesPayload }
            return r.ok && j.success ? j.preferences ?? {} : {}
          }),
        ])

        if (!active) return

        setPrefs(prefsRes)

        if (!response || !isOperationalContextData(response)) {
          setError(UI_HEALTH_CONTEXT_ERROR)
          setData(null)
          return
        }

        setData(response)
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
    const hydrationTarget = typeof p.hydrationTargetLiters === "number" && p.hydrationTargetLiters > 0
      ? p.hydrationTargetLiters
      : HEALTH_HYDRATION_TARGET
    const hydrationTracked =
      typeof p.hydrationLitersToday === "number" && Number.isFinite(p.hydrationLitersToday) && p.hydrationLitersToday >= 0
    const hydrationCurrent = hydrationTracked ? Math.max(0, Number(p.hydrationLitersToday!.toFixed(2))) : 0

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

    return {
      loading,
      error,
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
      macrosFromLog,
      macros,
      weeklyVolume,
      weeklyMealPlan: TRAINING_MEAL_PLAN,
      milestones,
      bodyMetrics,
      trainingDays,
      trainingMinutes,
    }
  }, [data, error, loading, prefs])
}
