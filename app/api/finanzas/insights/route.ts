import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialStabilityEngine } from "@/lib/engines/financialStabilityEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"
import { financialScoreEngine } from "@/lib/engines/financialScoreEngine"
import {
  mapRowToCategoryAggregation,
  mapRowToBudget,
  isValidCFORow,
  mapRowToCFOMonthly,
  mapRowToCuenta,
} from "@/lib/mappers/category.mapper"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    // =========================
    // MOVIMIENTOS + CATEGORÍAS
    // =========================
    const [movimientosRes, presupuestoRes, cfoRes, cuentasRes] =
      await Promise.all([
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Movimientos!A2:U5000",
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Presupuesto!A2:C200",
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Base mensual CFO!A2:H1000",
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
        sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: "Cuentas!A2:J200",
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
      ])

    const transactions = (movimientosRes.data.values || []).map(
      mapRowToCategoryAggregation
    )

    const { structuralCategories } = financialAdvancedEngine({
      transactions,
      month,
    })

    const budgetRows = (presupuestoRes.data.values || []).map(mapRowToBudget)

    const categories = financialBudgetEngine({
      structuralCategories,
      budgetRows,
    })

    // =========================
    // CFO — ingresos / gastos / flujo
    // =========================
    const cfoRows = (cfoRes.data.values || [])
      .filter(isValidCFORow)
      .map(mapRowToCFOMonthly)

    if (!cfoRows.length) {
      return NextResponse.json(
        { error: "Sin datos financieros" },
        { status: 404 }
      )
    }

    const targetRow =
      cfoRows.find((r) => r.mes === month) ?? cfoRows[cfoRows.length - 1]

    const { ingresos, gastoOperativo, gastoFinanciero, flujoTotal } = targetRow

    const gastoMensualTotal =
      Math.abs(gastoOperativo) + Math.abs(gastoFinanciero)

    // =========================
    // LIQUIDEZ + RUNWAY
    // =========================
    const liquidezTotal = (cuentasRes.data.values || [])
      .map(mapRowToCuenta)
      .reduce((acc, c) => (c.disponible > 0 ? acc + c.disponible : acc), 0)

    const runway =
      gastoMensualTotal > 0
        ? Number((liquidezTotal / gastoMensualTotal).toFixed(1))
        : 0

    // =========================
    // ENGINES
    // =========================
    const score = financialScoreEngine({
      ingresos,
      gastoOp: gastoOperativo,
      gastoFin: gastoFinanciero,
      flujo: flujoTotal,
    })

    const insight = financialInsightEngine({
      ingresos,
      flujo: flujoTotal,
      liquidez: liquidezTotal,
      runway,
      categories,
    })

    const stability = financialStabilityEngine({
      ingresos,
      gastoOperativo,
      gastoFinanciero,
      flujo: flujoTotal,
      liquidez: liquidezTotal,
      runway,
    })

    const prediction = financialPredictionEngine({
      monthlyHistory: cfoRows.slice(-6).map((r) => r.flujoTotal),
      liquidez: liquidezTotal,
    })

    return NextResponse.json({
      success: true,
      data: {
        score,
        insight,
        stability,
        prediction,
      },
    })
  } catch (error: any) {
    console.error("INSIGHTS ERROR:", error?.message)

    return NextResponse.json(
      { error: "Error cargando insights", details: error?.message },
      { status: 500 }
    )
  }
}

