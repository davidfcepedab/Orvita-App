import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { financialScoreEngine } from "@/lib/engines/financialScoreEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialStabilityEngine } from "@/lib/engines/financialStabilityEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"
import {
  isValidCFORow,
  mapRowToCFOMonthly,
  mapRowToCuenta,
} from "@/lib/mappers/category.mapper"

const SPREADSHEET_ID =
  "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const requestedMonth =
      req.nextUrl.searchParams.get("month")

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Base mensual CFO!A2:H1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const cfoRows = (res.data.values || [])
      .filter(isValidCFORow)
      .map(mapRowToCFOMonthly)

    if (!cfoRows.length) {
      return NextResponse.json(
        { success: false, error: "Sin datos financieros" },
        { status: 404 }
      )
    }

    const targetRow = requestedMonth
      ? (cfoRows.find((r) => r.mes === requestedMonth) ?? cfoRows[cfoRows.length - 1])
      : cfoRows[cfoRows.length - 1]

    const { ingresos, gastoOperativo, gastoFinanciero, flujoTotal } = targetRow

    const gastoMensualTotal =
      Math.abs(gastoOperativo) +
      Math.abs(gastoFinanciero)

    const monthlyData = cfoRows.slice(-6).map((r) => ({
      month: r.mes,
      ingresos: r.ingresos,
      gasto_operativo: Math.abs(r.gastoOperativo),
      gasto_financiero: Math.abs(r.gastoFinanciero),
      flujo: r.flujoTotal,
    }))

    const cuentasRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Cuentas!A2:J200",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const cuentas = (cuentasRes.data.values || []).map(mapRowToCuenta)

    const liquidezTotal = cuentas.reduce(
      (acc, c) => (c.disponible > 0 ? acc + c.disponible : acc),
      0
    )

    const runway =
      gastoMensualTotal > 0
        ? Number(
            (liquidezTotal / gastoMensualTotal).toFixed(1)
          )
        : 0

    const score = financialScoreEngine({
      ingresos,
      gastoOp: gastoOperativo,
      gastoFin: gastoFinanciero,
      flujo: flujoTotal,
    })

    const insight = financialInsightEngine({
  ingresos,
  flujo: flujoTotal,
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
        ingresos,
        gasto_operativo: gastoOperativo,
        gasto_financiero: gastoFinanciero,
        flujo_total: flujoTotal,
        monthlyData,
        liquidez: liquidezTotal,
        runway,
        score,
        insight,
        stability,
        prediction,
      },
    })
  } catch (error: any) {
    console.error("OVERVIEW ERROR:", error?.message)

    return NextResponse.json(
      { success: false, error: "Error cargando overview financiero" },
      { status: 500 }
    )
  }
}
