import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"

const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({ version: "v4", auth })

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    // =========================
    // MOVIMIENTOS
    // =========================
    const movimientosRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Movimientos!A2:U5000",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const movimientosRows =
      movimientosRes.data.values || []

    const structural =
      financialAdvancedEngine({
        rows: movimientosRows,
        month,
      })

    // =========================
    // PRESUPUESTO
    // =========================
    const presupuestoRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Presupuesto!A2:C200",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const presupuestoRows =
      presupuestoRes.data.values || []

    const structuralWithBudget =
      financialBudgetEngine({
        structuralCategories:
          structural.structuralCategories,
        budgetRows: presupuestoRows,
      })

    return NextResponse.json({
      ...structural,
      structuralCategories:
        structuralWithBudget,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error cargando categorías" },
      { status: 500 }
    )
  }
}
