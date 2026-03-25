import type { AppProfileId } from "../../config/profiles"
import type { OrvitaTask, OrvitaTaskStatus } from "../models"
import { loadSheetTable } from "./sheetTable"

function asString(value: unknown) {
  const s = typeof value === "string" ? value.trim() : String(value ?? "").trim()
  return s.length ? s : null
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value
  const s = String(value ?? "").trim().toLowerCase()
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true
  if (s === "0" || s === "false" || s === "no" || s === "n") return false
  return false
}

function asInt(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function asStatus(value: unknown): OrvitaTaskStatus {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "in_progress" || v === "in progress") return "in_progress"
  if (v === "completed" || v === "done") return "completed"
  if (v === "cancelled" || v === "canceled") return "cancelled"
  return "pending"
}

export async function listTasksFromSheets(input: { profileId: AppProfileId }) {
  const { rows } = await loadSheetTable({
    profileId: input.profileId,
    tabName: "agenda_tasks",
    spreadsheet: "agenda",
  })

  const tasks: OrvitaTask[] = rows.map((r) => {
    const id = asString(r.id) || asString(r.task_id) || `task_${Math.random().toString(36).slice(2)}`
    return {
      profileId: input.profileId,
      id,
      title: asString(r.title) || asString(r.name) || "",
      description: asString(r.description),
      status: asStatus(r.status),
      priority: asInt(r.priority, 0),
      dueAt: asString(r.due_at) || asString(r.dueAt),
      completedAt: asString(r.completed_at) || asString(r.completedAt),
      projectId: asString(r.project_id) || asString(r.projectId),
      archived: asBool(r.archived),
      updatedAt: asString(r.updated_at) || asString(r.updatedAt),
      createdAt: asString(r.created_at) || asString(r.createdAt),
    }
  }).filter((t) => t.title.length > 0)

  return tasks
}
