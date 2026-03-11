import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"

const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({ version: "v4", auth })

const SPREADSHEET_ID =
  "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

function getPreviousMonth(month: string) {
  const [year, m] = month.split("-").map(Number)
  const date = new Date(year, m - 2)
  return date.toISOString().slice(0, 7)
}

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const category =
      req.nextUrl.searchParams.get("category")

    const previousMonth = getPreviousMonth(month)

    const res =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Movimientos!A2:U5000",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const rows = res.data.values || []

    const current = rows.filter((r) => {
      const rowMonth = r?.[12]
      const rowCategory = r?.[6]

      if (!rowMonth) return false
      if (rowMonth !== month) return false
      if (category && rowCategory !== category)
        return false

      return true
    })

    const previous = rows.filter((r) => {
      const rowMonth = r?.[12]
      const rowCategory = r?.[6]

      if (!rowMonth) return false
      if (rowMonth !== previousMonth)
        return false
      if (category && rowCategory !== category)
        return false

      return true
    })

    const subtotal = current.reduce(
      (acc, r) =>
        acc + Math.abs(Number(r[10] || 0)),
      0
    )

    const previousSubtotal = previous.reduce(
      (acc, r) =>
        acc + Math.abs(Number(r[10] || 0)),
      0
    )

    const delta =
      previousSubtotal > 0
        ? Number(
            (
              ((subtotal -
                previousSubtotal) /
                previousSubtotal) *
              100
            ).toFixed(1)
          )
        : 0

    const transactions = current
      .map((r) => ({
        fecha: r[0],
        descripcion: r[4],
        categoria: r[6],
        subcategoria: r[7],
        cuenta: r[1],
        monto: Number(r[10] || 0),
      }))
      .reverse()

    return NextResponse.json({
      transactions,
      subtotal,
      previousSubtotal,
      delta,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error cargando movimientos" },
      { status: 500 }
    )
  }
}
