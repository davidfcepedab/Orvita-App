import { NextResponse } from "next/server"
import { getSheets } from "@/lib/googleAuth"

const SPREADSHEET_ID = "1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0"

export async function POST(req: Request) {
  try {
    const sheets = getSheets()
    const body = await req.json()

const entreno = body.entreno ? 1 : 0

const tipoEntreno = body.tipoEntreno || ""
const minutosEntreno =
  tipoEntreno === "Dia de descanso"
    ? 0
    : Number(body.minutosEntreno || 0)

const newRow = [
  body.fecha || "",
  "", "", "",
  body.horaDespertar || "",
  body.horaDormir || "",
  "",
  Number(body.calidadSueno || ""),
  Number(body.energia || ""),
  Number(body.ansiedad || ""),
  Number(body.estadoAnimo || ""),
  body.dietaCumplida ? 1 : 0,
  Number(body.agua || ""),
  "", "", "",
  Number(body.meditacion || ""),
  Number(body.lectura || ""),
  body.avanceProyecto ? 1 : 0,
  body.tiempoPareja ? 1 : 0,
  Number(body.calidadConexion || ""),
  body.interaccionSocial ? 1 : 0,
  entreno,
  tipoEntreno,
  minutosEntreno,
  Number(body.deepWork || ""),
  Number(body.productividad || ""),
  "",
  Number(body.peso || ""),
  "", "",
  Number(body.cintura || ""),
  "",
  "",
  Number(body.pecho || ""),
  Number(body.hombros || ""),
  Number(body.bicepsDer || ""),
  Number(body.bicepsIzq || ""),
  Number(body.cuadricepsDer || ""),
  Number(body.cuadricepsIzq || ""),
  Number(body.gluteos || ""),
]

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
