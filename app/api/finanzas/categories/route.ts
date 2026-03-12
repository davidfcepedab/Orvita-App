import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const movimientosRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Movimientos!A2:U5000",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const movimientosRows = movimientosRes.data.values || []

    const structural = financialAdvancedEngine({
      rows: movimientosRows,
      month,
    })

    const presupuestoRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Presupuesto!A2:C200",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const presupuestoRows = presupuestoRes.data.values || []

    const structuralWithBudget =
      financialBudgetEngine({
        structuralCategories:
          structural?.structuralCategories || [],
        budgetRows: presupuestoRows,
      })

    const insight = financialInsightEngine({
      structuralCategories: structuralWithBudget,
      totalFixed: structural.totalFixed,
      totalVariable: structural.totalVariable,
      totalStructural: structural.totalStructural,
    })

    const prediction = financialPredictionEngine({
      totalStructural: structural.totalStructural,
    })

    return NextResponse.json({
  VERSION: "INSIGHT_V2_ACTIVA",
  ...structural,
  structuralCategories: structuralWithBudget,
  insight,
  prediction,
})

  } catch (error: any) {
    console.error("CATEGORIES ERROR:", error?.message)

    return NextResponse.json(
      {
        success: false,
        error: "Error cargando categorías",
      },
      { status: 500 }
    )
  }
}
