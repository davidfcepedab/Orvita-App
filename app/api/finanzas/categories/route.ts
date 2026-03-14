import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"
import { mapRowToBudget } from "@/lib/mappers/category.mapper"
import { FINANZAS_SPREADSHEET_ID } from "@/lib/config/sheets"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const movimientosRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: FINANZAS_SPREADSHEET_ID,
        range: "Movimientos!A2:U5000",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const rows = movimientosRes.data.values || []

    const structural = financialAdvancedEngine({ rows, month })

    const presupuestoRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: FINANZAS_SPREADSHEET_ID,
        range: "Presupuesto!A2:C200",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const budgetRows = (presupuestoRes.data.values || []).map(mapRowToBudget)

    const structuralWithBudget = financialBudgetEngine({
      structuralCategories: structural?.structuralCategories || [],
      budgetRows,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...structural,
        structuralCategories: structuralWithBudget,
      },
    })

  } catch (error: any) {
    console.error("CATEGORIES ERROR:", error?.message)

    return NextResponse.json(
      { success: false, error: "Error cargando categorías" },
      { status: 500 }
    )
  }
}
