import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialAdvancedEngine } from "@/lib/engines/financialAdvancedEngine"
import { financialBudgetEngine } from "@/lib/engines/financialBudgetEngine"
import { financialScoreEngine } from "@/lib/engines/financialScoreEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialStabilityEngine } from "@/lib/engines/financialStabilityEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

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

    const movimientosRows = movimientosRes.data.values || []
    const presupuestoRows = presupuestoRes.data.values || []
    const cfoRows = cfoRes.data.values || []
    const cuentasRows = cuentasRes.data.values || []

    // Engine chain: advanced → budget
    const structural = financialAdvancedEngine({ rows: movimientosRows, month })
    const structuralWithBudget = financialBudgetEngine({
      structuralCategories: structural.structuralCategories,
      budgetRows: presupuestoRows,
    })

    // Extract CFO month row
    const cleanCfoRows = cfoRows.filter(
      (r) => r && r.length > 6 && !isNaN(Number(r[1]))
    )
    const cfoRow =
      cleanCfoRows.find((r) => r[0] === month) ||
      cleanCfoRows[cleanCfoRows.length - 1] ||
      []

    const ingresos = Number(cfoRow[1] || 0)
    const gastoOperativo = Number(cfoRow[2] || 0)
    const gastoFinanciero = Number(cfoRow[3] || 0)
    const flujo = Number(cfoRow[6] || 0)

    // Compute liquidez and runway from Cuentas
    let liquidez = 0
    for (const row of cuentasRows) {
      const disponible = Number(row?.[5] || 0)
      if (!isNaN(disponible) && disponible > 0) {
        liquidez += disponible
      }
    }

    const gastoMensualTotal =
      Math.abs(gastoOperativo) + Math.abs(gastoFinanciero)
    const runway =
      gastoMensualTotal > 0
        ? Number((liquidez / gastoMensualTotal).toFixed(1))
        : 0

    const score = financialScoreEngine({
      ingresos,
      gastoOp: gastoOperativo,
      gastoFin: gastoFinanciero,
      flujo,
    })

    const insight = financialInsightEngine({
      structuralCategories: structuralWithBudget,
      totalFixed: structural.totalFixed,
      totalVariable: structural.totalVariable,
      totalStructural: structural.totalStructural,
    })

    const stability = financialStabilityEngine({
      ingresos,
      gastoOperativo,
      gastoFinanciero,
      flujo,
      liquidez,
      runway,
    })

    const prediction = financialPredictionEngine({
      totalStructural: structural.totalStructural,
    })

    return NextResponse.json({
      success: true,
      data: { score, insight, stability, prediction },
    })
  } catch (error: any) {
    console.error("INSIGHTS ERROR:", error?.message)

    return NextResponse.json(
      {
        success: false,
        error: "Error cargando insights financieros",
        details: error?.message,
      },
      { status: 500 }
    )
  }
}

