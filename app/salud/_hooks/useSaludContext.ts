"use client"

import { useEffect, useMemo, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
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

type TendenciaItem = {
  value: number
}

type RawContextData = {
  score_fisico: number
  score_disciplina: number
  score_recuperacion: number
  delta_disciplina: number
  delta_recuperacion: number
  tendencia_7d: TendenciaItem[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function isRawContextData(value: unknown): value is RawContextData {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  const numbers =
    typeof obj.score_fisico === "number" &&
    typeof obj.score_disciplina === "number" &&
    typeof obj.score_recuperacion === "number" &&
    typeof obj.delta_disciplina === "number" &&
    typeof obj.delta_recuperacion === "number"
  if (!numbers) return false
  if (!Array.isArray(obj.tendencia_7d)) return false
  return obj.tendencia_7d.every((item) => {
    if (!item || typeof item !== "object") return false
    const record = item as Record<string, unknown>
    return typeof record.value === "number"
  })
}

const MOCK_CONTEXT_RAW: RawContextData = {
  score_fisico: 72,
  score_disciplina: 68,
  score_recuperacion: 74,
  delta_disciplina: 0,
  delta_recuperacion: 0,
  tendencia_7d: [58, 62, 55, 67, 63, 70, 64].map((v) => ({ value: v })),
}

export function useSaludContext() {
  const [data, setData] = useState<RawContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (isAppMockMode()) {
        setData(MOCK_CONTEXT_RAW)
        setError(null)
        setLoading(false)
        return
      }

      try {
        const response = await getContext()

        if (!active) {
          return
        }

        if (!response || !isRawContextData(response)) {
          setError("No pude cargar el contexto de salud.")
          return
        }

        setData(response)
      } catch {
        if (active) {
          setError("No pude cargar el contexto de salud.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  return useMemo(() => {
    const scoreFisico = data?.score_fisico ?? 0
    const scoreDisciplina = data?.score_disciplina ?? 0
    const scoreRecuperacion = data?.score_recuperacion ?? 0
    const deltaDisciplina = data?.delta_disciplina ?? 0
    const deltaRecuperacion = data?.delta_recuperacion ?? 0
    const tendencia = data?.tendencia_7d ?? []

    const bodyBattery = clamp(Math.round(scoreRecuperacion * 0.68 + scoreFisico * 0.32), 24, 99)
    const sleepScore = clamp(Math.round(scoreRecuperacion * 0.94), 35, 99)
    const hrv = clamp(Math.round(28 + scoreRecuperacion * 0.42), 24, 92)
    const restingHR = clamp(Math.round(69 - scoreRecuperacion * 0.13), 46, 68)
    const strain = clamp(Math.round(scoreFisico * 0.82 + scoreDisciplina * 0.18), 20, 95)

    const trendAverage =
      tendencia.length > 0
        ? tendencia.reduce((total, item) => total + item.value, 0) / tendencia.length
        : 0

    const energyAudit = HEALTH_ENERGY_PROFILE.map((item) => ({
      hour: item.hour,
      energy: clamp(bodyBattery + item.offset, 10, 96),
      fatigue: clamp(100 - (bodyBattery + item.offset), 4, 90),
    }))

    const supplementStack = HEALTH_SUPPLEMENT_STACK.map((item, index) => ({
      ...item,
      taken: index < Math.round(scoreDisciplina / 25),
    }))

    const hydrationCurrent = Number((1.5 + scoreDisciplina / 80).toFixed(1))

    const macros = [
      {
        ...HEALTH_MACRO_TARGETS.protein,
        current: Math.round(128 + scoreFisico / 2.5),
      },
      {
        ...HEALTH_MACRO_TARGETS.carbs,
        current: Math.round(150 + scoreDisciplina * 1.1),
      },
      {
        ...HEALTH_MACRO_TARGETS.fats,
        current: Math.round(48 + scoreRecuperacion / 3),
      },
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
      scoreFisico,
      scoreDisciplina,
      scoreRecuperacion,
      deltaDisciplina,
      deltaRecuperacion,
      tendencia,
      trendAverage,
      sleepScore,
      bodyBattery,
      hrv,
      restingHR,
      strain,
      energyAudit,
      supplementStack,
      hydrationCurrent,
      hydrationTarget: HEALTH_HYDRATION_TARGET,
      macros,
      weeklyVolume,
      weeklyMealPlan: TRAINING_MEAL_PLAN,
      milestones,
      bodyMetrics,
      trainingDays,
      trainingMinutes,
    }
  }, [data, error, loading])
}
