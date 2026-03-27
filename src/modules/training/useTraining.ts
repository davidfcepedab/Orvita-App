"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { TrainingDay, TrainingStatus } from "@/src/modules/training/types"

const todayKey = () => new Date().toISOString().slice(0, 10)

type TrainingState = {
  days: TrainingDay[]
  today: TrainingDay | null
  loading: boolean
  error: string | null
  manualStatus: TrainingStatus | null
  setManualStatus: (status: TrainingStatus) => void
}

export function useTraining(): TrainingState {
  const [days, setDays] = useState<TrainingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualStatus, setManualStatus] = useState<TrainingStatus | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/integrations/hevy/workouts", { cache: "no-store" })
        const payload = (await response.json()) as {
          success?: boolean
          trainingDays?: TrainingDay[]
          error?: string
        }

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "No se pudo cargar Hevy")
        }

        if (active) {
          setDays(payload.trainingDays ?? [])
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Error cargando entrenos"
          setError(message)
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

  const today = useMemo(() => {
    const key = todayKey()
    const fromHevy = days.find((day) => day.date === key) || null
    if (fromHevy) return fromHevy
    if (!manualStatus) return null
    const manualDay: TrainingDay = {
      date: key,
      source: "manual",
      status: manualStatus,
    }
    return manualDay
  }, [days, manualStatus])

  const setManualStatusSafe = useCallback((status: TrainingStatus) => {
    setManualStatus(status)
  }, [])

  return {
    days,
    today,
    loading,
    error,
    manualStatus,
    setManualStatus: setManualStatusSafe,
  }
}
