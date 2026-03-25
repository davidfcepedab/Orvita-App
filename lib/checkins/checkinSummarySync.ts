import { sheets } from "../googleAuth"
import { resolvePersonalSpreadsheetId, type AppProfileId } from "../config/profiles"
import { parseCheckinRowToSummary, type OrvitaDailyCheckinSummary } from "./checkinSummary"

export type OrvitaCheckinSyncStats = {
  totalRows: number
  parsedRows: number
  beforeCutoff: number
  missingDayCell: number
  invalidDay: number
  uniqueDays: number
}

export async function loadDailyCheckinSummariesFromSheets(input: {
  profileId: AppProfileId
  daysBack: number
}) {
  const result = await loadDailyCheckinSummariesFromSheetsWithStats(input)
  return result.summaries
}

export async function loadDailyCheckinSummariesFromSheetsWithStats(input: {
  profileId: AppProfileId
  daysBack: number
  sampleLimit?: number
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

  const stats: OrvitaCheckinSyncStats = {
    totalRows: rows.length,
    parsedRows: 0,
    beforeCutoff: 0,
    missingDayCell: 0,
    invalidDay: 0,
    uniqueDays: 0,
  }

  const sampleLimit = Math.max(0, Math.min(10, input.sampleLimit ?? 0))
  const samples: Array<{
    rowIndex: number
    dayCellType: string
    dayCellValue: string | number | null
    parsedDay: string | null
  }> = []

  const byDay = new Map<string, OrvitaDailyCheckinSummary>()
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const rowCells = (Array.isArray(row) ? row : []) as unknown[]
    const dayCell = rowCells[0]

    const summary = parseCheckinRowToSummary(rowCells)
    if (!summary) {
      if (
        dayCell === null ||
        dayCell === undefined ||
        (typeof dayCell === "string" && dayCell.trim().length === 0)
      ) {
        stats.missingDayCell += 1
      } else {
        stats.invalidDay += 1
      }

      if (samples.length < sampleLimit) {
        samples.push({
          rowIndex: index,
          dayCellType: typeof dayCell,
          dayCellValue: typeof dayCell === "string" || typeof dayCell === "number" ? dayCell : null,
          parsedDay: null,
        })
      }
      continue
    }

    stats.parsedRows += 1
    if (summary.day < cutoffDay) {
      stats.beforeCutoff += 1
      continue
    }

    byDay.set(summary.day, summary)

    if (samples.length < sampleLimit) {
      samples.push({
        rowIndex: index,
        dayCellType: typeof dayCell,
        dayCellValue: typeof dayCell === "string" || typeof dayCell === "number" ? dayCell : null,
        parsedDay: summary.day,
      })
    }
  }

  stats.uniqueDays = byDay.size

  const summaries = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day))
  return { summaries, stats, samples, cutoffDay }
}
