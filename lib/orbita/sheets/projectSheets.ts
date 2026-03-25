import type { AppProfileId } from "../../config/profiles"
import type { OrvitaProject } from "../models"
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

export async function listProjectsFromSheets(input: { profileId: AppProfileId }) {
  const { rows } = await loadSheetTable({
    profileId: input.profileId,
    tabName: "agenda_projects",
    spreadsheet: "agenda",
  })

  const projects: OrvitaProject[] = rows.map((r) => {
    const id = asString(r.id) || asString(r.project_id) || `project_${Math.random().toString(36).slice(2)}`
    return {
      profileId: input.profileId,
      id,
      title: asString(r.title) || asString(r.name) || "",
      description: asString(r.description),
      color: asString(r.color),
      archived: asBool(r.archived),
      updatedAt: asString(r.updated_at ?? r.updatedAt),
      createdAt: asString(r.created_at ?? r.createdAt),
    }
  }).filter((p) => p.title.length > 0)

  return projects
}
