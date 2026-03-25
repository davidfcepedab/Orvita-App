import type { AppProfileId } from "../../config/profiles"
import type { OrvitaHabit } from "../models"
import { orvitaFallbackToSheetsEnabled, resolveOrvitaDataSource } from "../featureFlags"
import { listHabitsFromSheets } from "../sheets/habitSheets"
import { deleteHabitFromSupabase, listHabitsFromSupabase, upsertHabitToSupabase } from "../supabase/orbitaSupabase"

export async function listOrvitaHabits(input: { profileId: AppProfileId }) {
  const source = resolveOrvitaDataSource("habits")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") return { source, data: await listHabitsFromSheets(input) }

  try {
    const data = await listHabitsFromSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    return { source: "sheets" as const, data: await listHabitsFromSheets(input) }
  }
}

export async function upsertOrvitaHabit(input: {
  profileId: AppProfileId
  habit: Pick<OrvitaHabit, "id" | "title" | "description" | "frequency" | "goal" | "archived">
}) {
  const source = resolveOrvitaDataSource("habits")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") {
    throw new Error("Sheets write for habits is not enabled yet")
  }

  try {
    const data = await upsertHabitToSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    throw new Error("Supabase failed and Sheets write is not enabled yet")
  }
}

export async function deleteOrvitaHabit(input: { profileId: AppProfileId; id: string }) {
  const source = resolveOrvitaDataSource("habits")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") {
    throw new Error("Sheets delete for habits is not enabled yet")
  }

  try {
    await deleteHabitFromSupabase(input)
    return { source: "supabase" as const, ok: true }
  } catch (error) {
    if (!fallback) throw error
    throw new Error("Supabase failed and Sheets delete is not enabled yet")
  }
}
