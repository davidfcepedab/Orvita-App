"use client"

import { useEffect, useState } from "react"
import type { OperationalContextData } from "@/lib/operational/types"

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
        const payload = (await response.json()) as {
          success: boolean
          data?: OperationalContextData
          error?: string
        }
        if (!payload.success || !payload.data) {
          throw new Error(payload.error || "Error cargando contexto")
        }
        if (!cancelled) {
          setData(payload.data)
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
