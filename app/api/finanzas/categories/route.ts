import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"
import { mapRowToCategoryAggregation, mapRowToBudget } from "@/lib/mappers/category.mapper"

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

    const transactions = (movimientosRes.data.values || []).map(mapRowToCategoryAggregation)

    const structural = financialAdvancedEngine({
      transactions,
      month,
    })

    const presupuestoRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Presupuesto!A2:C200",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const budgetRows = (presupuestoRes.data.values || []).map(mapRowToBudget)

    const structuralWithBudget = financialBudgetEngine({
      structuralCategories: structural?.structuralCategories || [],
      budgetRows,
    })

    return NextResponse.json({
      ...structural,
      structuralCategories: structuralWithBudget.map((cat) => ({
        ...cat,
        subcategories: cat.subs || [],
      })),
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
