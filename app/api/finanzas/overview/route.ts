import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"
import { financialScoreEngine } from "@/lib/engines/financialScoreEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"
import { financialStabilityEngine } from "@/lib/engines/financialStabilityEngine"
import { financialPredictionEngine } from "@/lib/engines/financialPredictionEngine"

const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({ version: "v4", auth })

const SPREADSHEET_ID =
  "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const requestedMonth = req.nextUrl.searchParams.get("month")

    // =============================
    // 1. BASE MENSUAL
    // =============================
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Base mensual CFO!A2:H1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const rows = res.data.values || []

    const cleanRows = rows.filter(
      (r) => r && r.length > 6 && !isNaN(Number(r[1]))
    )

    if (!cleanRows.length) {
      return NextResponse.json(
        { error: "Sin datos financieros" },
        { status: 404 }
      )
    }

    let monthRow = requestedMonth
      ? cleanRows.find((r) => r[0] === requestedMonth)
      : null

    if (!monthRow) {
      monthRow = cleanRows[cleanRows.length - 1]
    }

    const ingresos = Number(monthRow[1] || 0)
    const gastoOperativo = Number(monthRow[2] || 0)
    const gastoFinanciero = Number(monthRow[3] || 0)
    const flujoTotal = Number(monthRow[6] || 0)

    const gastoMensualTotal =
      Math.abs(gastoOperativo) + Math.abs(gastoFinanciero)

    const monthlyData = cleanRows.slice(-6).map((r) => ({
      month: r[0],
      ingresos: Number(r[1] || 0),
      gasto_operativo: Math.abs(Number(r[2] || 0)),
      gasto_financiero: Math.abs(Number(r[3] || 0)),
      flujo: Number(r[6] || 0),
    }))

    // =============================
    // 2. LIQUIDEZ (CUENTAS)
    // =============================
    const cuentas = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Cuentas!A2:J200",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const cuentasRows = cuentas.data.values || []

    let liquidezTotal = 0

    for (const row of cuentasRows) {
      const disponible = Number(row?.[5] || 0)
      if (!isNaN(disponible) && disponible > 0) {
        liquidezTotal += disponible
      }
    }

    const runway =
      gastoMensualTotal > 0
        ? Number((liquidezTotal / gastoMensualTotal).toFixed(1))
        : 0

    // =============================
    // 3. ENGINES
    // =============================
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
      monthlyHistory: cleanRows
        .slice(-6)
        .map((r) => Number(r[6] || 0)),
      liquidez: liquidezTotal,
    })

    // =============================
    // 4. RESPONSE
    // =============================
    return NextResponse.json({
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
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error cargando overview financiero" },
      { status: 500 }
    )
  }
}
