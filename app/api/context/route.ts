import { NextResponse } from "next/server"
import { getSheets } from "@/lib/googleAuth"
import { predictionEngine } from "@/lib/engines/predictionEngine"

const SPREADSHEET_ID = "1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0"

// Mapeo de índices para mejor legibilidad
const CONTROL_SCORES = {
  RECUPERACION: 0,      // B15
  DISCIPLINA: 6,        // B21
  FISICO: 12,           // B27
  PROFESIONAL: 13,      // B28
  GLOBAL: 14,           // B29
} as const

// Mapeo de columnas en Histórico
const HISTORICO_COLS = {
  DATE: 0,
  CAMPO_1: 1,
  CAMPO_2: 2,
  RECUPERACION: 3,
  DISCIPLINA: 4,
  GLOBAL: 5,
} as const

export async function GET() {
  try {
    const sheets = getSheets()
    // =====================================
    // 1️⃣ SCORES DESDE CONTROL
    // =====================================
    const control = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Control!B15:B29",  // Ajustado para B29
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const controlValues = control.data.values || []

    // Validación de datos
    if (controlValues.length === 0) {
      console.warn("No control values found")
    }

    const scoreRecuperacion = Number(controlValues[CONTROL_SCORES.RECUPERACION]?.[0] || 0)
    const scoreDisciplina = Number(controlValues[CONTROL_SCORES.DISCIPLINA]?.[0] || 0)
    const scoreFisico = Number(controlValues[CONTROL_SCORES.FISICO]?.[0] || 0)
    const scoreProfesional = Number(controlValues[CONTROL_SCORES.PROFESIONAL]?.[0] || 0)
    const scoreGlobal = Number(controlValues[CONTROL_SCORES.GLOBAL]?.[0] || 0)

    // =====================================
    // 2️⃣ HISTÓRICO BASE
    // =====================================
    const historico = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Historico Base!A2:F1000",
      valueRenderOption: "UNFORMATTED_VALUE",
    })

    const rows = (historico.data.values || []).filter(
      (r) => Array.isArray(r) && r.length > HISTORICO_COLS.GLOBAL && r[HISTORICO_COLS.DATE] && r[HISTORICO_COLS.GLOBAL]
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
        Number(current[HISTORICO_COLS.GLOBAL] || 0),
        Number(previous[HISTORICO_COLS.GLOBAL] || 0)
      )

      deltaDisciplina = safeDelta(
        Number(current[HISTORICO_COLS.DISCIPLINA] || 0),
        Number(previous[HISTORICO_COLS.DISCIPLINA] || 0)
      )

      deltaRecuperacion = safeDelta(
        Number(current[HISTORICO_COLS.RECUPERACION] || 0),
        Number(previous[HISTORICO_COLS.RECUPERACION] || 0)
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
      .filter((v) => !isNaN(v) && isFinite(v))  // Agregado isFinite

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
    // 5️⃣ PREDICCIÓN
    // =====================================
    const prediction = predictionEngine(last14)

    // =====================================
    // 6️⃣ INSIGHTS
    // =====================================
    const insights: string[] = []

    // =====================================
    // 7️⃣ RESPONSE
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
      { error: "Error cargando contexto" },
      { status: 500 }
    )
  }
}
