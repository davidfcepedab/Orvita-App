import type { AppProfileId } from "../../config/profiles"
import { orvitaFallbackToSheetsEnabled, resolveOrvitaDataSource } from "../featureFlags"
import { listProjectsFromSheets } from "../sheets/projectSheets"
import { listProjectsFromSupabase } from "../supabase/orbitaSupabase"

export async function listOrvitaProjects(input: { profileId: AppProfileId }) {
  const source = resolveOrvitaDataSource("projects")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") return { source, data: await listProjectsFromSheets(input) }

  try {
    const data = await listProjectsFromSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    return { source: "sheets" as const, data: await listProjectsFromSheets(input) }
  }
}

