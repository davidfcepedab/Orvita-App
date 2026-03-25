import type { AppProfileId } from "../../config/profiles"
import type { OrvitaCalendarEvent, OrvitaCalendarEventSource } from "../models"
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

function asSource(value: unknown): OrvitaCalendarEventSource | null {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "google") return "google"
  if (v === "manual") return "manual"
  return null
}

export async function listCalendarEventsFromSheets(input: { profileId: AppProfileId }) {
  const { rows } = await loadSheetTable({
    profileId: input.profileId,
    tabName: "agenda_calendar_events",
    spreadsheet: "agenda",
  })

  const events: OrvitaCalendarEvent[] = rows.map((r) => {
    const id = asString(r.id) || asString(r.event_id) || `event_${Math.random().toString(36).slice(2)}`
    const startAt = asString(r.start_at ?? r.startAt) || ""
    return {
      profileId: input.profileId,
      id,
      title: asString(r.title) || asString(r.name) || "",
      description: asString(r.description),
      startAt,
      endAt: asString(r.end_at ?? r.endAt),
      allDay: asBool(r.all_day ?? r.allDay),
      location: asString(r.location),
      source: asSource(r.source),
      updatedAt: asString(r.updated_at ?? r.updatedAt),
      createdAt: asString(r.created_at ?? r.createdAt),
    }
  }).filter((e) => e.title.length > 0 && e.startAt.length > 0)

  return events
}
