"use client"

import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { fetchGoogleCalendarGetCoalesced } from "@/lib/google/googleCalendarInflightGet"
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
  /** Evita `loading=true` en refrescos posteriores (stale-while-revalidate) para no parpadear la agenda. */
  const initialCalendarFetchDoneRef = useRef(false)

  const load = useCallback(async (range?: { timeMin: string; timeMax: string }) => {
    const showBlockingSpinner = !initialCalendarFetchDoneRef.current
    try {
      if (showBlockingSpinner) setLoading(true)
      setError(null)
      setNotice(null)
      const now = new Date()
      const dMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dMin.setDate(dMin.getDate() - 45)
      const dMax = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      dMax.setDate(dMax.getDate() + 400)
      dMax.setHours(23, 59, 59, 999)
      const timeMin = range?.timeMin ?? dMin.toISOString()
      const timeMax = range?.timeMax ?? dMax.toISOString()
      const qs = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      const url = `/api/google/calendar?${qs}`
      const { res, payload } = await fetchGoogleCalendarGetCoalesced(url)
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const ev = payload.events ?? []
      const conn = payload.connected ?? false
      const n = payload.notice ?? null
      if (initialCalendarFetchDoneRef.current) {
        startTransition(() => {
          setEvents(ev)
          setConnected(conn)
          setNotice(n)
        })
      } else {
        setEvents(ev)
        setConnected(conn)
        setNotice(n)
        initialCalendarFetchDoneRef.current = true
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      if (initialCalendarFetchDoneRef.current) {
        startTransition(() => {
          setError(msg)
          setEvents([])
          setConnected(false)
        })
      } else {
        setError(msg)
        setEvents([])
        setConnected(false)
      }
    } finally {
      if (showBlockingSpinner) setLoading(false)
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
