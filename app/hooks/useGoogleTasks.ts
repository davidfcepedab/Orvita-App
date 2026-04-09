"use client"

import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import { isAppMockMode } from "@/lib/checkins/flags"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { fetchGoogleTasksGetCoalesced } from "@/lib/google/googleTasksInflightGet"
import type { GoogleTaskDTO, GoogleTaskLocalPriority } from "@/lib/google/types"

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
  patchTask: (
    id: string,
    patch: {
      due?: string | null
      title?: string
      status?: string
      localAssigneeUserId?: string | null
      localPriority?: GoogleTaskLocalPriority | null
    },
  ) => Promise<GoogleTaskDTO | null>
  removeTask: (id: string) => Promise<boolean>
}

export function useGoogleTasks(): GoogleTasksFeedState {
  const [tasks, setTasks] = useState<GoogleTaskDTO[]>([])
  const [loading, setLoading] = useState(!isAppMockMode())
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const initialTasksFetchDoneRef = useRef(false)

  const load = useCallback(async () => {
    const showBlockingSpinner = !initialTasksFetchDoneRef.current
    try {
      if (showBlockingSpinner) setLoading(true)
      setError(null)
      setNotice(null)
      const url = "/api/google/tasks"
      const { res, payload } = await fetchGoogleTasksGetCoalesced(url)
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const list = payload.tasks ?? []
      const conn = payload.connected ?? false
      const n = payload.notice ?? null
      if (initialTasksFetchDoneRef.current) {
        startTransition(() => {
          setTasks(list)
          setConnected(conn)
          setNotice(n)
        })
      } else {
        setTasks(list)
        setConnected(conn)
        setNotice(n)
        initialTasksFetchDoneRef.current = true
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error"
      if (initialTasksFetchDoneRef.current) {
        startTransition(() => {
          setError(msg)
          setTasks([])
          setConnected(false)
        })
      } else {
        setError(msg)
        setTasks([])
        setConnected(false)
      }
    } finally {
      if (showBlockingSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patchTask = useCallback(
    async (
      id: string,
      patch: {
        due?: string | null
        title?: string
        status?: string
        localAssigneeUserId?: string | null
        localPriority?: GoogleTaskLocalPriority | null
      },
    ) => {
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

  const removeTask = useCallback(
    async (id: string) => {
      try {
        setError(null)
        const headers = await browserBearerHeaders(true)
        const res = await fetch("/api/google/tasks", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ id }),
        })
        const payload = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !payload.success) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        await load()
        return true
      } catch (e) {
        const m = e instanceof Error ? e.message : "Error"
        setError(m)
        return false
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

  return { tasks, loading, error, connected, notice, creating, refresh: load, createTask, patchTask, removeTask }
}
