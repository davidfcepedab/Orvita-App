import { NextRequest, NextResponse } from "next/server"
import { getSheets } from "@/lib/googleAuth"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"
import { financialScoreEngine } from "@/lib/engines/financialScoreEngine"
import { financialStabilityEngine } from "@/lib/engines/financialStabilityEngine"
import { isValidCFORow, mapRowToCFOMonthly, mapRowToCuenta } from "@/lib/mappers/category.mapper"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const sheets = getSheets()
    const requestedMonth = req.nextUrl.searchParams.get("month")

    const cfoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Base mensual CFO!A2:H1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const cfoRows = (cfoRes.data.values || [])
      .filter(isValidCFORow)
      .map(mapRowToCFOMonthly)

    if (!cfoRows.length) {
      return NextResponse.json(
        { success: false, error: "Sin datos financieros" },
        { status: 404 }
      )
    }

    const targetRow = requestedMonth
      ? cfoRows.find((row) => row.mes === requestedMonth) ?? cfoRows[cfoRows.length - 1]
      : cfoRows[cfoRows.length - 1]

    const { ingresos, gastoOperativo, gastoFinanciero, flujoTotal } = targetRow

    const cuentasRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Cuentas!A2:J200",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const liquidez = (cuentasRes.data.values || [])
      .map(mapRowToCuenta)
      .reduce((acc, row) => (row.disponible > 0 ? acc + row.disponible : acc), 0)

    const gastoMensualTotal = Math.abs(gastoOperativo) + Math.abs(gastoFinanciero)
    const runway = gastoMensualTotal > 0 ? Number((liquidez / gastoMensualTotal).toFixed(1)) : 0

    const score = financialScoreEngine({
      ingresos,
      gastoOp: gastoOperativo,
      gastoFin: gastoFinanciero,
      flujo: flujoTotal,
    })

    const rawInsight = financialInsightEngine({
      ingresos,
      flujo: flujoTotal,
    })

    const stability = financialStabilityEngine({
      ingresos,
      gastoOperativo,
      gastoFinanciero,
      flujo: flujoTotal,
      liquidez,
      runway,
    })

    const predictionRaw = financialPredictionEngine({
      monthlyHistory: cfoRows.slice(-6).map((row) => row.flujoTotal),
      liquidez,
    })

    const prediction = {
      projection: [
        { month: "1", projectedBalance: predictionRaw.projectedNextMonth },
        { month: "2", projectedBalance: predictionRaw.projectedNextMonth * 2 },
        { month: "3", projectedBalance: predictionRaw.projectedNextMonth * 3 },
      ],
      trend: predictionRaw.trend,
      warning: predictionRaw.warning,
      runwayMonths: predictionRaw.runwayMonths,
    }

    const insightType = rawInsight.riskLevel === "critical" ? "alert" : "info"
    const insightMessage =
      rawInsight.alerts[0] ??
      (rawInsight.riskLevel === "stable"
        ? "Flujo saludable y estable."
        : "Hay señales de tension financiera.")

    return NextResponse.json({
      success: true,
      data: {
        score,
        insight: {
          type: insightType,
          message: insightMessage,
          all: rawInsight.alerts,
        },
        stability,
        prediction,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("INSIGHTS ERROR:", message)
    return NextResponse.json(
      { success: false, error: "Error cargando insights financieros" },
      { status: 500 }
    )
  }
}
