import type { CheckinFormPayload, CheckinPreloadData } from "@/lib/checkins/checkinPayload"
import { parseCheckinRowToSummary, type OrvitaDailyCheckinSummary } from "@/lib/checkins/checkinSummary"

/**
 * JSON map of form field name → 0-based column index in the sheet row.
 * Example: {"peso":14,"pct_grasa":15,"cintura":16}
 */
function parseBodyColumnMap(): Record<string, number> {
  const raw = process.env.ORVITA_CHECKIN_BODY_METRICS_COLUMNS?.trim()
  if (!raw) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function parseBodyMetricsCellsFromRow(row: unknown[]): Partial<CheckinFormPayload> {
  const map = parseBodyColumnMap()
  const partial: Partial<CheckinFormPayload> = {}
  for (const [key, idx] of Object.entries(map)) {
    const cell = row[idx]
    if (cell === undefined || cell === null) continue
    const s = String(cell).trim()
    if (!s) continue
    ;(partial as Record<string, unknown>)[key] = Number.isFinite(Number(s)) && s !== "" ? Number(s) : s
  }
  return partial
}

export function mergeSheetRowIntoPreload(
  row: unknown[],
  sheetRowId: string
): CheckinPreloadData {
  const summary: OrvitaDailyCheckinSummary | null = parseCheckinRowToSummary(row)
  const bodyPartial = parseBodyMetricsCellsFromRow(row)

  const out: CheckinPreloadData = {
    ...bodyPartial,
    sheet_row_id: sheetRowId,
    source: "sheets",
    _summary: summary,
  }

  if (summary) {
    if (summary.day) out.fecha = summary.day
    if (summary.energy != null) out.energia = summary.energy
    if (summary.mood != null) out.estadoAnimo = summary.mood
    if (summary.focus != null) out.productividad = summary.focus
  }

  return out
}

