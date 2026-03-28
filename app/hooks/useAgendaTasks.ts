"use client"

import { useCallback, useEffect, useState } from "react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"

export type AgendaTaskStatus = "pending" | "in-progress" | "completed"
export type AgendaTaskPriority = "Alta" | "Media" | "Baja"
export type AgendaTaskType = "personal" | "assigned" | "received"

export interface AgendaTask {
  id: string
  title: string
  status: AgendaTaskStatus
  priority: AgendaTaskPriority
  estimatedMinutes: number
  dueDate: string | null
  assigneeId: string | null
  assigneeName: string | null
  createdBy: string
  type: AgendaTaskType
  createdAt: string
}

type AgendaResponse = {
  success: boolean
  data?: AgendaTask[]
  error?: string
}

export function useAgendaTasks() {
  const [tasks, setTasks] = useState<AgendaTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await browserBearerHeaders()
      const response = await fetch("/api/agenda", { cache: "no-store", headers })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      setTasks(json.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createTask = useCallback(
    async (input: {
      title: string
      priority: AgendaTaskPriority
      estimatedMinutes?: number
      dueDate?: string | null
      assigneeId?: string | null
      assigneeName?: string | null
    }) => {
      const headers = await browserBearerHeaders(true)
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      await refresh()
    },
    [refresh]
  )

  const updateTask = useCallback(
    async (
      id: string,
      patch: Partial<{
        title: string
        status: AgendaTaskStatus
        priority: AgendaTaskPriority
        estimatedMinutes: number
        dueDate: string | null
        assigneeId: string | null
        assigneeName: string | null
      }>
    ) => {
      const headers = await browserBearerHeaders(true)
      const response = await fetch("/api/agenda", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id, ...patch }),
      })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      await refresh()
    },
    [refresh]
  )

  return {
    tasks,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
  }
}
