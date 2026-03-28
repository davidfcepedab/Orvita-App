"use client"

import { useCallback, useEffect, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

export function useGoogleCalendar() {
  const [events, setEvents] = useState<GoogleCalendarEventDTO[]>([])
  const [loading, setLoading] = useState(!isAppMockMode())
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setNotice(null)
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/google/calendar", { cache: "no-store", headers })
      const payload = (await res.json()) as {
        success?: boolean
        events?: GoogleCalendarEventDTO[]
        connected?: boolean
        notice?: string
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setEvents(payload.events ?? [])
      setConnected(payload.connected ?? false)
      setNotice(payload.notice ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setEvents([])
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { events, loading, error, connected, notice, refresh: load }
}
