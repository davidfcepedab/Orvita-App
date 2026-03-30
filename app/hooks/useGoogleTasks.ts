"use client"

import { useCallback, useEffect, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { GoogleTaskDTO } from "@/lib/google/types"

export type GoogleTasksFeedState = {
  tasks: GoogleTaskDTO[]
  loading: boolean
  error: string | null
  connected: boolean
  notice: string | null
  creating: boolean
  refresh: () => Promise<void>
  createTask: (input: { title: string; notes?: string; due?: string | null }) => Promise<GoogleTaskDTO | null>
  /** Actualiza vencimiento (YYYY-MM-DD) u otros campos en Google Tasks. */
  patchTask: (id: string, patch: { due?: string | null; title?: string; status?: string }) => Promise<GoogleTaskDTO | null>
}

export function useGoogleTasks(): GoogleTasksFeedState {
  const [tasks, setTasks] = useState<GoogleTaskDTO[]>([])
  const [loading, setLoading] = useState(!isAppMockMode())
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setNotice(null)
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/google/tasks", { cache: "no-store", headers })
      const payload = (await res.json()) as {
        success?: boolean
        tasks?: GoogleTaskDTO[]
        connected?: boolean
        notice?: string
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setTasks(payload.tasks ?? [])
      setConnected(payload.connected ?? false)
      setNotice(payload.notice ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setTasks([])
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patchTask = useCallback(
    async (id: string, patch: { due?: string | null; title?: string; status?: string }) => {
      try {
        setError(null)
        const headers = await browserBearerHeaders(true)
        const res = await fetch("/api/google/tasks", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, ...patch }),
        })
        const payload = (await res.json()) as { success?: boolean; task?: GoogleTaskDTO; error?: string }
        if (!res.ok || !payload.success) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        await load()
        return payload.task ?? null
      } catch (e) {
        const m = e instanceof Error ? e.message : "Error"
        setError(m)
        return null
      }
    },
    [load],
  )

  const createTask = useCallback(
    async (input: { title: string; notes?: string; due?: string | null }) => {
      try {
        setCreating(true)
        setError(null)
        const headers = await browserBearerHeaders(true)
        const res = await fetch("/api/google/tasks", {
          method: "POST",
          headers,
          body: JSON.stringify(input),
        })
        const payload = (await res.json()) as { success?: boolean; task?: GoogleTaskDTO; error?: string }
        if (!res.ok || !payload.success) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        await load()
        return payload.task ?? null
      } catch (e) {
        const m = e instanceof Error ? e.message : "Error"
        setError(m)
        return null
      } finally {
        setCreating(false)
      }
    },
    [load],
  )

  return { tasks, loading, error, connected, notice, creating, refresh: load, createTask, patchTask }
}
