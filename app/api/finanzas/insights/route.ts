import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialInsightsEngine } from "@/lib/engines/financialInsightsEngine"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const movimientosRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Movimientos!A2:U5000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const rows = movimientosRes.data.values || []

    const structural = financialAdvancedEngine({ rows, month })

    const insights = financialInsightsEngine({
      categories: structural.structuralCategories,
      flujo: structural.totalFinancialFlow,
    })

    return NextResponse.json({ success: true, data: { insights } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error cargando insights" },
      { status: 500 }
    )
  }
}

