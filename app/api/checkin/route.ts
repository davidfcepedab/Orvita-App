import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"

const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({ version: "v4", auth })

const SPREADSHEET_ID = "1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ==============================
    // 🧠 MAPEO EXACTO DE COLUMNAS
    // ==============================
    // Solo columnas manuales
    // A, E, F, H, I, J, K, L, M, Q, R, S, T, U, V, W, X, Y, Z, AA, AC, AF, AI, AJ, AK, AL, AM, AN, AO

    const newRow = [
      body.fecha || "",                 // A
      "", "", "",                       // B C D (fórmulas)
      body.horaDespertar || "",         // E
      body.horaDormir || "",            // F
      "",                               // G (fórmula)
      body.calidadSueno || "",          // H
      body.energia || "",               // I
      body.ansiedad || "",              // J
      body.estadoAnimo || "",           // K
      body.dietaCumplida || 0,          // L
      body.agua || "",                  // M
      "", "", "",                       // N O P (fórmulas)
      body.meditacion || "",            // Q
      body.lectura || "",               // R
      body.avanceProyecto || 0,         // S
      body.tiempoPareja || 0,           // T
      body.calidadConexion || "",       // U
      body.interaccionSocial || 0,      // V
      body.entreno || 0,                // W
      body.tipoEntreno || "",           // X
      body.minutosEntreno || "",        // Y
      body.deepWork || "",              // Z
      body.productividad || "",         // AA
      "",                               // AB (fórmula)
      body.peso || "",                  // AC
      "", "",                           // AD AE (fórmulas)
      body.cintura || "",               // AF
      "",                               // AG (fórmula)
      "",                               // AH (fórmula)
      body.pecho || "",                 // AI
      body.hombros || "",               // AJ
      body.bicepsDer || "",             // AK
      body.bicepsIzq || "",             // AL
      body.cuadricepsDer || "",         // AM
      body.cuadricepsIzq || "",         // AN
      body.gluteos || "",               // AO
    ]

    // ==============================
    // 📌 APPEND SEGURO
    // ==============================

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Check In Diario!A2",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [newRow],
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error guardando check-in" },
      { status: 500 }
    )
  }
}
