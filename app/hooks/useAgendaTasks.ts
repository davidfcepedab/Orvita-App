"use client"

import { startTransition, useCallback, useEffect, useRef, useState } from "react"
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
  /** ISO timestamp cuando el asignatario aceptó (null si aún no o no aplica). */
  assignmentAcceptedAt?: string | null
  /** Id del task en Google cuando la fila Órvita está sincronizada (evita duplicado en vista unificada). */
  googleTaskId?: string | null
}

type AgendaResponse = {
  success: boolean
  data?: AgendaTask[]
  /** Asignaciones de otros pendientes de aceptar (no entran en el tablero hasta aceptar). */
  pendingAssignments?: AgendaTask[]
  error?: string
}

export function useAgendaTasks() {
  const [tasks, setTasks] = useState<AgendaTask[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<AgendaTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Tras la primera carga OK: refetch sin pantalla de carga y con startTransition (mejor INP). */
  const initialFetchDoneRef = useRef(false)

  const refresh = useCallback(async () => {
    const showBlockingLoading = !initialFetchDoneRef.current
    try {
      if (showBlockingLoading) {
        setLoading(true)
      }
      setError(null)
      const headers = await browserBearerHeaders()
      const response = await fetch("/api/agenda", { cache: "no-store", headers })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      const nextTasks = json.data || []
      const nextPending = json.pendingAssignments ?? []
      if (initialFetchDoneRef.current) {
        startTransition(() => {
          setTasks(nextTasks)
          setPendingAssignments(nextPending)
        })
      } else {
        setTasks(nextTasks)
        setPendingAssignments(nextPending)
        initialFetchDoneRef.current = true
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      if (initialFetchDoneRef.current) {
        startTransition(() => {
          setError(message)
          setTasks([])
          setPendingAssignments([])
        })
      } else {
        setError(message)
        setTasks([])
        setPendingAssignments([])
      }
    } finally {
      if (showBlockingLoading) {
        setLoading(false)
      }
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
      const personal =
        (input.assigneeId == null || String(input.assigneeId).trim() === "") &&
        (input.assigneeName == null || String(input.assigneeName).trim() === "")
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...input,
          // Órvita → Google Tasks solo para tareas “para mí” (sin asignatario).
          syncToGoogle: personal,
        }),
      })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      await refresh()
    },
    [refresh],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const headers = await browserBearerHeaders(true)
      const response = await fetch("/api/agenda", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id }),
      })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      await refresh()
    },
    [refresh],
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
        acceptAssignment: boolean
      }>,
    ) => {
      const headers = await browserBearerHeaders(true)
      const body =
        patch.acceptAssignment === true
          ? { id, acceptAssignment: true as const }
          : { id, ...patch }
      const response = await fetch("/api/agenda", {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      })
      const json = (await response.json()) as AgendaResponse
      if (!response.ok || !json.success) {
        throw new Error(messageForHttpError(response.status, json.error, response.statusText))
      }
      await refresh()
    },
    [refresh],
  )

  return {
    tasks,
    pendingAssignments,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
  }
}
