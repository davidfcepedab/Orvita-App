"use client"

import { useEffect, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode } from "@/lib/checkins/flags"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { OperationalContextData } from "@/lib/operational/types"

async function contextHeaders(): Promise<HeadersInit> {
  if (isAppMockMode()) return {}
  try {
    const supabase = createBrowserClient() as {
      auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
    }
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
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
        const headers = await contextHeaders()
        const response = await fetch("/api/context", { cache: "no-store", headers })
        const payload = (await response.json()) as {
          success?: boolean
          data?: OperationalContextData
          error?: string
        }
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(messageForHttpError(response.status, payload.error, response.statusText))
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
