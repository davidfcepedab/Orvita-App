import { sheets } from "../googleAuth"
import { resolvePersonalSpreadsheetId, type AppProfileId } from "../config/profiles"
import { parseCheckinRowToSummary, type OrvitaDailyCheckinSummary } from "./checkinSummary"

export async function loadDailyCheckinSummariesFromSheets(input: {
  profileId: AppProfileId
  daysBack: number
}) {
  const spreadsheetId = resolvePersonalSpreadsheetId(input.profileId)
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Check In Diario!A2:AB1000",
    valueRenderOption: "UNFORMATTED_VALUE",
  }).then((response) => response.data.values || [])

  const daysBack = Math.max(1, Math.min(3650, input.daysBack))
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffDay = cutoff.toISOString().slice(0, 10)

  const byDay = new Map<string, OrvitaDailyCheckinSummary>()
  for (const row of rows) {
    const summary = parseCheckinRowToSummary(row as unknown[])
    if (!summary) continue
    if (summary.day < cutoffDay) continue
    byDay.set(summary.day, summary)
  }

  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day))
}

