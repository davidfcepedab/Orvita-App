"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode } from "@/lib/checkins/flags"
import { buildMockTrainingDays } from "@/lib/training/mockTrainingDays"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { TrainingDataMeta, TrainingDay, TrainingStatus, TrainingTodayState } from "@/src/modules/training/types"

import { agendaTodayYmd } from "@/lib/agenda/localDateKey"

async function buildAuthHeaders(): Promise<HeadersInit> {
  if (isAppMockMode()) return {}
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

type TrainingState = {
  days: TrainingDay[]
  today: TrainingDay | null
  loading: boolean
  error: string | null
  manualStatus: TrainingStatus | null
  setManualStatus: (status: TrainingStatus) => void
  todayState: TrainingTodayState
  dataMeta: TrainingDataMeta
}

export function useTraining(): TrainingState {
  const [days, setDays] = useState<TrainingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualStatus, setManualStatus] = useState<TrainingStatus | null>(null)
  const [dataMeta, setDataMeta] = useState<TrainingDataMeta>({
    lastSyncAt: null,
    sourceLabel: "Hevy",
    fetchedWorkouts: 0,
  })

  useEffect(() => {
    let active = true

    const load = async () => {
      if (isAppMockMode()) {
        setLoading(false)
        setError(null)
        setDays(buildMockTrainingDays())
        return
      }

      try {
        setLoading(true)
        setError(null)
        const headers = await buildAuthHeaders()
        const response = await fetch("/api/integrations/hevy/workouts", { cache: "no-store", headers })
        const payload = (await response.json()) as {
          success?: boolean
          trainingDays?: TrainingDay[]
          error?: string
          lastSyncAt?: string | null
          sourceLabel?: string
          fetchedWorkouts?: number
        }

        if (!response.ok || !payload.success) {
          throw new Error(messageForHttpError(response.status, payload.error, response.statusText))
        }

        if (active) {
          setDays(payload.trainingDays ?? [])
          setDataMeta({
            lastSyncAt: payload.lastSyncAt ?? null,
            sourceLabel: payload.sourceLabel ?? "Hevy",
            fetchedWorkouts: payload.fetchedWorkouts ?? 0,
          })
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Error cargando entrenos"
          setError(message)
          setDataMeta((prev) => ({ ...prev, lastSyncAt: null }))
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

  const todayYmd = agendaTodayYmd()
  const today = useMemo(() => {
    const fromHevy = days.find((day) => day.date === todayYmd) || null
    if (fromHevy) return fromHevy
    if (!manualStatus) return null
    const manualDay: TrainingDay = {
      date: todayYmd,
      source: "manual",
      status: manualStatus,
    }
    return manualDay
  }, [days, manualStatus, todayYmd])

  const setManualStatusSafe = useCallback((status: TrainingStatus) => {
    setManualStatus(status)
  }, [])

  const todayState: TrainingTodayState = useMemo(() => {
    if (today?.status === "trained" || today?.status === "swim") return "completed"
    if (today?.status === "skip") return "moved"
    if (today?.status === "rest") return "rest"
    if (manualStatus === "skip") return "moved"
    if (manualStatus === "rest") return "rest"
    return "pending"
  }, [today, manualStatus])

  return {
    days,
    today,
    loading,
    error,
    manualStatus,
    setManualStatus: setManualStatusSafe,
    todayState,
    dataMeta,
  }
}
