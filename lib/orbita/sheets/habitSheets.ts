import type { AppProfileId } from "../../config/profiles"
import type { OrvitaHabit, OrvitaHabitFrequency } from "../models"
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

function asFrequency(value: unknown): OrvitaHabitFrequency {
  const v = String(value ?? "").trim().toLowerCase()
  if (v === "weekly" || v === "semanal") return "weekly"
  return "daily"
}

export async function listHabitsFromSheets(input: { profileId: AppProfileId }) {
  const { rows } = await loadSheetTable({
    profileId: input.profileId,
    tabName: "agenda_habits",
    spreadsheet: "agenda",
  })

  const habits: OrvitaHabit[] = rows.map((r) => {
    const id = asString(r.id) || asString(r.habit_id) || `habit_${Math.random().toString(36).slice(2)}`
    return {
      profileId: input.profileId,
      id,
      title: asString(r.title) || asString(r.name) || "",
      description: asString(r.description),
      frequency: asFrequency(r.frequency),
      goal: asInt(r.goal, 1),
      currentStreak: asInt(r.current_streak ?? r.currentStreak, 0),
      longestStreak: asInt(r.longest_streak ?? r.longestStreak, 0),
      lastCompletionDate: asString(r.last_completion_date ?? r.lastCompletionDate),
      archived: asBool(r.archived),
      updatedAt: asString(r.updated_at ?? r.updatedAt),
      createdAt: asString(r.created_at ?? r.createdAt),
    }
  }).filter((h) => h.title.length > 0)

  return habits
}
