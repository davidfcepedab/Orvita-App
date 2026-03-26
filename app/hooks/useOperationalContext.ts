"use client"

import { useEffect, useState } from "react"

export interface OperationalContextData {
  score_global: number
  score_fisico: number
  score_profesional: number
  score_disciplina: number
  score_recuperacion: number
  delta_global: number
  delta_disciplina: number
  delta_recuperacion: number
  delta_tendencia: number
  tendencia_7d: { value: number }[]
  prediction: unknown
  insights: string[]
  today_tasks?: any[]
  habits?: any[]
  next_action?: string
  next_impact?: string
  next_time_required?: string
  current_block?: string
}

export function useOperationalContext() {
  const [data, setData] = useState<OperationalContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/context", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }
        const json = (await response.json()) as OperationalContextData
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Error desconocido"
          setError(message)
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
