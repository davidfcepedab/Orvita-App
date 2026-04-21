"use client"

import { useCallback, useEffect, useState } from "react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"

export type AutoHealthMetric = {
  observed_at: string
  sleep_hours: number | null
  hrv_ms: number | null
  readiness_score: number | null
  steps: number | null
  calories: number | null
  energy_index: number | null
  source: string | null
}

export function useHealthAutoMetrics() {
  const [latest, setLatest] = useState<AutoHealthMetric | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/metrics", { headers, cache: "no-store" })
      const payload = (await res.json()) as { success?: boolean; latest?: AutoHealthMetric | null }
      if (res.ok && payload.success) {
        setLatest(payload.latest ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { latest, loading, refetch }
}
