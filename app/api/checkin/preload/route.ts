import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { mergeSheetRowIntoPreload } from "@/lib/checkins/checkinSheetPreload"
import {
  API_CHECKIN_PRELOAD_EMPTY_NO_SYNC,
  API_CHECKIN_PRELOAD_MOCK_NO_SYNC,
  API_CHECKIN_PRELOAD_NO_ROW_NO_SYNC,
  API_CHECKIN_PRELOAD_SHEETS_NO_ROWS_NO_SYNC,
  API_CHECKIN_PRELOAD_SHEETS_OK_NO_SYNC,
  getCheckinApiFlagsSnapshot,
  isAppMockMode,
  isSupabaseEnabled,
} from "@/lib/checkins/flags"
import {
  fetchSpreadsheetValues,
  pickLastNonEmptyRow,
  resolveCheckinSheetFirstRowNumber,
  resolveCheckinSheetRangeA1,
  resolveCheckinSpreadsheetId,
} from "@/lib/checkins/sheetsAccess"
import { formatLocalDateKey } from "@/lib/agenda/localDateKey"

export const runtime = "nodejs"

function mockPreloadPayload() {
  const today = formatLocalDateKey(new Date())
  return {
    fecha: today,
    energia: 7,
    estadoAnimo: 8,
    productividad: 6,
    peso: 78.2,
    pct_grasa: 16.5,
    cintura: 86,
    pecho: 102,
    sheet_row_id: "mock-42",
    source: "sheets" as const,
  }
}

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        source: "mock",
        data: mockPreloadPayload(),
        flags: getCheckinApiFlagsSnapshot(),
        notice: isSupabaseEnabled() ? undefined : API_CHECKIN_PRELOAD_MOCK_NO_SYNC,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const spreadsheetId = resolveCheckinSpreadsheetId()
    if (!spreadsheetId) {
      return NextResponse.json(
        {
          success: true,
          source: "none",
          data: {},
          message: "Sin CHECKIN_MEASURES_SPREADSHEET_ID ni PERSONAL_SPREADSHEET_ID configurados.",
          flags: getCheckinApiFlagsSnapshot(),
          notice: !isSupabaseEnabled() ? API_CHECKIN_PRELOAD_EMPTY_NO_SYNC : undefined,
        },
        { status: 200 }
      )
    }

    const range = resolveCheckinSheetRangeA1()
    const firstRow = resolveCheckinSheetFirstRowNumber()
    const values = await fetchSpreadsheetValues(spreadsheetId, range)

    if (!values || values.length === 0) {
      return NextResponse.json({
        success: true,
        source: "none",
        data: {},
        message: "La hoja no devolvió filas para el rango configurado.",
        flags: getCheckinApiFlagsSnapshot(),
        notice: !isSupabaseEnabled() ? API_CHECKIN_PRELOAD_SHEETS_NO_ROWS_NO_SYNC : undefined,
      })
    }

    const last = pickLastNonEmptyRow(values, firstRow)
    if (!last) {
      return NextResponse.json({
        success: true,
        source: "none",
        data: {},
        message: "No se encontró una fila con datos.",
        flags: getCheckinApiFlagsSnapshot(),
        notice: !isSupabaseEnabled() ? API_CHECKIN_PRELOAD_NO_ROW_NO_SYNC : undefined,
      })
    }

    const merged = mergeSheetRowIntoPreload(last.cells, last.sheetRowId)
    const { _summary, ...data } = merged

    return NextResponse.json({
      success: true,
      source: "sheet",
      data,
      summary: _summary,
      flags: getCheckinApiFlagsSnapshot(),
      notice: !isSupabaseEnabled() ? API_CHECKIN_PRELOAD_SHEETS_OK_NO_SYNC : undefined,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    console.error("CHECKIN PRELOAD ERROR:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}


