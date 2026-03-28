import type { GoogleTaskDTO } from "@/lib/google/types"

type GoogleTaskRaw = {
  id?: string
  title?: string
  status?: string
  due?: string
}

type TasksListResponse = {
  items?: GoogleTaskRaw[]
}

function normalizeDue(value?: string): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

export function mapGoogleTask(task: GoogleTaskRaw): GoogleTaskDTO | null {
  if (!task.id) return null
  const title = typeof task.title === "string" && task.title.trim() ? task.title.trim() : "(Sin título)"
  return {
    id: task.id,
    title,
    status: task.status ?? null,
    due: normalizeDue(task.due),
  }
}

const DEFAULT_LIST = "https://www.googleapis.com/tasks/v1/lists/%40default/tasks"

export async function fetchDefaultTaskList(accessToken: string, showCompleted = false): Promise<GoogleTaskDTO[]> {
  const params = new URLSearchParams({
    maxResults: "100",
    showCompleted: showCompleted ? "true" : "false",
    showHidden: "false",
  })

  const response = await fetch(`${DEFAULT_LIST}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Tasks: ${detail}`)
  }

  const payload = (await response.json()) as TasksListResponse
  const items = payload.items ?? []
  const out: GoogleTaskDTO[] = []
  for (const item of items) {
    const row = mapGoogleTask(item)
    if (row) out.push(row)
  }
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
