"use client"

import { useCallback, useEffect, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OperationalContextData } from "@/lib/operational/types"

/** Reutiliza `browserBearerHeaders`: getSession con timeout; evita “Cargando…” infinito si Supabase no responde. */
async function contextHeaders(): Promise<HeadersInit> {
  return browserBearerHeaders(false)
}

const CONTEXT_FETCH_TIMEOUT_MS = 45_000

export function useOperationalContext() {
  const [data, setData] = useState<OperationalContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const headers = await contextHeaders()
        const ac = new AbortController()
        const timeoutId = window.setTimeout(() => ac.abort(), CONTEXT_FETCH_TIMEOUT_MS)
        let response: Response
        try {
          response = await fetch("/api/context", { cache: "no-store", headers, signal: ac.signal })
        } finally {
          window.clearTimeout(timeoutId)
        }
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
          const aborted =
            (err instanceof DOMException && err.name === "AbortError") ||
            (err instanceof Error && err.name === "AbortError")
          const message = aborted
            ? "La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo."
            : err instanceof Error
              ? err.message
              : "Error desconocido"
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
  }, [reloadToken])

  return { data, loading, error, refetch }
}
