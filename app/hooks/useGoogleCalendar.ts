"use client"

import { useCallback, useEffect, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

export type GoogleCalendarFeedState = {
  events: GoogleCalendarEventDTO[]
  loading: boolean
  error: string | null
  connected: boolean
  notice: string | null
  refresh: () => Promise<void>
  /** Ventana explícita (p. ej. al navegar meses en la agenda). */
  refreshRange: (range: { timeMin: string; timeMax: string }) => Promise<void>
  deleteEvent: (eventId: string) => Promise<boolean>
}

export function useGoogleCalendar(): GoogleCalendarFeedState {
  const [events, setEvents] = useState<GoogleCalendarEventDTO[]>([])
  const [loading, setLoading] = useState(!isAppMockMode())
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (range?: { timeMin: string; timeMax: string }) => {
    try {
      setLoading(true)
      setError(null)
      setNotice(null)
      const headers = await browserBearerHeaders()
      const now = new Date()
      const dMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dMin.setDate(dMin.getDate() - 45)
      const dMax = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dMax.setDate(dMax.getDate() + 400)
      dMax.setHours(23, 59, 59, 999)
      const timeMin = range?.timeMin ?? dMin.toISOString()
      const timeMax = range?.timeMax ?? dMax.toISOString()
      const qs = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      const res = await fetch(`/api/google/calendar?${qs}`, { cache: "no-store", headers })
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

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      setError(null)
      const headers = await browserBearerHeaders(true)
      const res = await fetch("/api/google/calendar", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id: eventId }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      return false
    }
  }, [load])

  return {
    events,
    loading,
    error,
    connected,
    notice,
    refresh: () => load(),
    refreshRange: (range: { timeMin: string; timeMax: string }) => load(range),
    deleteEvent,
  }
}
