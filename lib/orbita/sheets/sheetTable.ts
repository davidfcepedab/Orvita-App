import { sheets } from "../../googleAuth"
import {
  resolveAgendaSpreadsheetId,
  resolvePersonalSpreadsheetId,
  type AppProfileId,
} from "../../config/profiles"

function toKey(value: unknown) {
  return String(value ?? "").trim()
}

export async function loadSheetTable(input: {
  profileId: AppProfileId
  tabName: string
  range?: string
  spreadsheet?: "agenda" | "personal"
}) {
  const spreadsheetId =
    input.spreadsheet === "personal"
      ? resolvePersonalSpreadsheetId(input.profileId)
      : resolveAgendaSpreadsheetId(input.profileId)
  const range = input.range ?? `${input.tabName}!A1:AZ5000`

  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
  }).then((res) => res.data.values || [])

  if (rows.length === 0) return { header: [] as string[], rows: [] as Record<string, unknown>[] }

  const headerRow = rows[0] || []
  const header = headerRow.map(toKey).filter(Boolean)
  const out: Record<string, unknown>[] = []

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] || []
    if (!Array.isArray(row) || row.length === 0) continue

    const obj: Record<string, unknown> = {}
    for (let j = 0; j < header.length; j += 1) {
      obj[header[j]] = row[j]
    }

    // Skip fully-empty rows
    const hasAny = Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
    if (!hasAny) continue

    out.push(obj)
  }

  return { header, rows: out }
}
