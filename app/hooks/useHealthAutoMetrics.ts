"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { ShortcutHealthAnalyticsSnapshot } from "@/lib/health/shortcutHealthAnalytics"

export type AutoHealthMetric = {
  observed_at: string
  /** Cuándo Órvita insertó esta fila (recepción en servidor). */
  created_at?: string | null
  sleep_hours: number | null
  hrv_ms: number | null
  readiness_score: number | null
  steps: number | null
  calories: number | null
  energy_index: number | null
  resting_hr_bpm: number | null
  apple_workouts_count: number | null
  apple_workout_minutes: number | null
  source: string | null
  metadata?: Record<string, unknown> | null
}

export function useHealthAutoMetrics() {
  const [latest, setLatest] = useState<AutoHealthMetric | null>(null)
  const [timeline, setTimeline] = useState<AutoHealthMetric[]>([])
  const [analytics, setAnalytics] = useState<ShortcutHealthAnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const hasLoadedOnce = useRef(false)

  const refetch = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent && hasLoadedOnce.current)
    if (!silent) setLoading(true)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/metrics", { headers, cache: "no-store" })
      const payload = (await res.json()) as {
        success?: boolean
        latest?: AutoHealthMetric | null
        timeline?: AutoHealthMetric[]
        analytics?: ShortcutHealthAnalyticsSnapshot
      }
      if (res.ok && payload.success) {
        setLatest(payload.latest ?? null)
        setTimeline(Array.isArray(payload.timeline) ? payload.timeline : [])
        setAnalytics(payload.analytics ?? null)
      } else {
        setAnalytics(null)
      }
    } finally {
      hasLoadedOnce.current = true
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch({ silent: true })
    }
    const onPageShow = (ev: PageTransitionEvent) => {
      if (ev.persisted) void refetch({ silent: true })
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [refetch])

  return { latest, timeline, analytics, loading, refetch }
}
