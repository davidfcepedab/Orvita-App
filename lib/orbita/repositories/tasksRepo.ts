import type { AppProfileId } from "../../config/profiles"
import type { OrvitaTask } from "../models"
import { orvitaFallbackToSheetsEnabled, resolveOrvitaDataSource } from "../featureFlags"
import { listTasksFromSheets } from "../sheets/taskSheets"
import { deleteTaskFromSupabase, listTasksFromSupabase, upsertTaskToSupabase } from "../supabase/orbitaSupabase"

export async function listOrvitaTasks(input: { profileId: AppProfileId }) {
  const source = resolveOrvitaDataSource("tasks")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") return { source, data: await listTasksFromSheets(input) }

  try {
    const data = await listTasksFromSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    return { source: "sheets" as const, data: await listTasksFromSheets(input) }
  }
}

export async function upsertOrvitaTask(input: {
  profileId: AppProfileId
  task: Pick<OrvitaTask, "id" | "title" | "description" | "status" | "priority" | "dueAt" | "projectId" | "archived">
}) {
  const source = resolveOrvitaDataSource("tasks")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") {
    // Escritura a Sheets se implementa en una fase posterior.
    throw new Error("Sheets write for tasks is not enabled yet")
  }

  try {
    const data = await upsertTaskToSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    throw new Error("Supabase failed and Sheets write is not enabled yet")
  }
}

export async function deleteOrvitaTask(input: { profileId: AppProfileId; id: string }) {
  const source = resolveOrvitaDataSource("tasks")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") {
    throw new Error("Sheets delete for tasks is not enabled yet")
  }

  try {
    await deleteTaskFromSupabase(input)
    return { source: "supabase" as const, ok: true }
  } catch (error) {
    if (!fallback) throw error
    throw new Error("Supabase failed and Sheets delete is not enabled yet")
  }
}
