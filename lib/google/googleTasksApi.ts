import type { GoogleTaskDTO } from "@/lib/google/types"

type GoogleTaskRaw = {
  id?: string
  title?: string
  status?: string
  due?: string
}

type TasksListResponse = {
  items?: GoogleTaskRaw[]
  nextPageToken?: string
}

/**
 * RFC 3339 desde Google Tasks → instante UTC ISO (misma regla que sync a `external_tasks`).
 */
export function normalizeGoogleTaskDueToIso(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

export function mapGoogleTask(task: GoogleTaskRaw): GoogleTaskDTO | null {
  if (!task.id) return null
  const title = typeof task.title === "string" && task.title.trim() ? task.title.trim() : "(Sin título)"
  return {
    id: task.id,
    title,
    status: task.status ?? null,
    due: normalizeGoogleTaskDueToIso(task.due),
  }
}

const DEFAULT_LIST = "https://www.googleapis.com/tasks/v1/lists/%40default/tasks"

export async function fetchDefaultTaskList(accessToken: string, showCompleted = false): Promise<GoogleTaskDTO[]> {
  const out: GoogleTaskDTO[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      maxResults: "200",
      showCompleted: showCompleted ? "true" : "false",
      showHidden: "false",
    })
    if (pageToken) params.set("pageToken", pageToken)

    const response = await fetch(`${DEFAULT_LIST}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Google Tasks: ${detail}`)
    }

    const payload = (await response.json()) as TasksListResponse
    const items = payload.items ?? []
    for (const item of items) {
      const row = mapGoogleTask(item)
      if (row) out.push(row)
    }
    pageToken = payload.nextPageToken
  } while (pageToken)

  return out
}

export async function insertDefaultListTask(
  accessToken: string,
  input: { title: string; notes?: string; due?: string | null },
): Promise<GoogleTaskRaw> {
  const body: Record<string, string> = { title: input.title.trim() }
  if (input.notes?.trim()) body.notes = input.notes.trim()
  if (input.due) {
    const d = input.due.includes("T") ? input.due : `${input.due}T12:00:00.000Z`
    body.due = d
  }

  const response = await fetch(DEFAULT_LIST, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Tasks create: ${detail}`)
  }

  return (await response.json()) as GoogleTaskRaw
}

export async function patchDefaultListTask(
  accessToken: string,
  taskId: string,
  patch: { due?: string | null; title?: string; status?: string },
): Promise<GoogleTaskRaw> {
  const id = encodeURIComponent(taskId)
  const body: Record<string, string> = {}
  if (patch.title != null) body.title = patch.title.trim()
  if (patch.status != null) body.status = patch.status
  if (patch.due !== undefined) {
    if (patch.due === null || patch.due === "") {
      body.due = ""
    } else {
      const d = patch.due.includes("T") ? patch.due : `${patch.due}T12:00:00.000Z`
      body.due = d
    }
  }

  const response = await fetch(`${DEFAULT_LIST}/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Tasks patch: ${detail}`)
  }

  return (await response.json()) as GoogleTaskRaw
}

export async function deleteDefaultListTask(accessToken: string, taskId: string): Promise<void> {
  const id = encodeURIComponent(taskId)
  const response = await fetch(`${DEFAULT_LIST}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 204 || response.status === 200) return
  if (response.status === 404) return
  const detail = await response.text()
  throw new Error(`Google Tasks delete: ${detail}`)
}
