import type { AppProfileId } from "../../config/profiles"
import { orvitaFallbackToSheetsEnabled, resolveOrvitaDataSource } from "../featureFlags"
import { listCalendarEventsFromSheets } from "../sheets/calendarSheets"
import { listCalendarEventsFromSupabase } from "../supabase/orbitaSupabase"

export async function listOrvitaCalendarEvents(input: {
  profileId: AppProfileId
  from?: string
  to?: string
}) {
  const source = resolveOrvitaDataSource("calendar_events")
  const fallback = orvitaFallbackToSheetsEnabled()

  if (source === "sheets") return { source, data: await listCalendarEventsFromSheets({ profileId: input.profileId }) }

  try {
    const data = await listCalendarEventsFromSupabase(input)
    return { source: "supabase" as const, data }
  } catch (error) {
    if (!fallback) throw error
    return { source: "sheets" as const, data: await listCalendarEventsFromSheets({ profileId: input.profileId }) }
  }
}

