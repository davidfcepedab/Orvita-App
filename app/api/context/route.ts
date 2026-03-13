import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"

import { predictionEngine } from "@/lib/engines/predictionEngine"
import { financialInsightEngine } from "@/lib/engines/financialInsightEngine"

const SPREADSHEET_ID = "1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0"

export async function GET() {
  try {
    // =====================================
    // 1️⃣ SCORES DESDE CONTROL
    // =====================================
    const control = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Control!B15:B30",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const controlValues = control.data.values || []

    const scoreRecuperacion = Number(controlValues[0]?.[0] || 0)
    const scoreDisciplina = Number(controlValues[6]?.[0] || 0)
    const scoreFisico = Number(controlValues[13]?.[0] || 0)
    const scoreProfesional = Number(controlValues[14]?.[0] || 0)
    const scoreGlobal = Number(controlValues[15]?.[0] || 0)

    // =====================================
    // 2️⃣ HISTÓRICO BASE
    // =====================================
    const historico = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Historico Base!A2:F1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const rows = (historico.data.values || []).filter(
      (r) => r[0] && r[5]
    )

    let deltaGlobal = 0
    let deltaDisciplina = 0
    let deltaRecuperacion = 0

    const safeDelta = (curr: number, prev: number) =>
      prev === 0
        ? 0
        : Number((((curr - prev) / prev) * 100).toFixed(1))

    if (rows.length >= 2) {
      const current = rows[rows.length - 1]
      const previous = rows[rows.length - 2]

      deltaGlobal = safeDelta(
        Number(current[5] || 0),
        Number(previous[5] || 0)
      )

      deltaDisciplina = safeDelta(
        Number(current[4] || 0),
        Number(previous[4] || 0)
      )

      deltaRecuperacion = safeDelta(
        Number(current[3] || 0),
        Number(previous[3] || 0)
      )
    }

    // =====================================
    // 3️⃣ TENDENCIA DIARIA
    // =====================================
    const diario = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Check In Diario!AB2:AB1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const diarioRows = (diario.data.values || [])
      .map((r) => Number(r[0]))
      .filter((v) => !isNaN(v))

    const last7 = diarioRows.slice(-7)

    const tendencia_7d = last7.map((v) => ({
      value: v,
    }))

    // =====================================
    // 4️⃣ DELTA TENDENCIA
    // =====================================
    let delta_tendencia = 0
    const last14 = diarioRows.slice(-14)

    if (last14.length >= 14) {
      const prev7 = last14.slice(0, 7)
      const curr7 = last14.slice(7)

      const avgPrev =
        prev7.reduce((a, b) => a + b, 0) / prev7.length

      const avgCurr =
        curr7.reduce((a, b) => a + b, 0) / curr7.length

      if (avgPrev !== 0) {
        delta_tendencia = Number(
          (((avgCurr - avgPrev) / avgPrev) * 100).toFixed(1)
        )
      }
    }

    // =====================================
    // 5️⃣ PREDICCIÓN + INSIGHTS
    // =====================================
    const prediction = predictionEngine(last14)

    const insights = []

    // =====================================
    // 6️⃣ RESPONSE
    // =====================================
    return NextResponse.json({
      score_global: scoreGlobal,
      score_fisico: scoreFisico,
      score_profesional: scoreProfesional,
      score_disciplina: scoreDisciplina,
      score_recuperacion: scoreRecuperacion,

      delta_global: deltaGlobal,
      delta_disciplina: deltaDisciplina,
      delta_recuperacion: deltaRecuperacion,
      delta_tendencia,

      tendencia_7d,
      prediction,
      insights,
    })

  } catch (error: any) {
    console.error("CONTEXT ERROR:", error?.message)

    return NextResponse.json(
      { error: "Error cargando contexto", details: error?.message },
      { status: 500 }
    )
  }
}
