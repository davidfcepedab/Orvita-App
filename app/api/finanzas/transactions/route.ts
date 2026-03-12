import { NextRequest, NextResponse } from "next/server"
import { sheets } from "@/lib/googleAuth"
import { mapRowToTransaction } from "@/lib/mappers/transaction.mapper"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const month =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const category =
      req.nextUrl.searchParams.get("category")

    const subcategory =
      req.nextUrl.searchParams.get("subcategory")

    const movimientosRes =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Movimientos!A2:U5000",
        valueRenderOption: "UNFORMATTED_VALUE",
      })

    const rawRows = movimientosRes.data.values || []

    const transactions = rawRows
      .map(mapRowToTransaction)
      .filter((tx) => {
        if (!tx.mes) return false
        if (tx.mes !== month) return false
        if (category && tx.categoria !== category) return false
        if (subcategory && tx.subcategoria !== subcategory) return false
        return true
      })

    const subtotal = transactions.reduce(
      (acc, tx) => acc + tx.monto,
      0
    )

    return NextResponse.json({
      transactions,
      subtotal,
      previousSubtotal: 0,
      delta: 0,
    })

  } catch (error: any) {
    console.error("TRANSACTIONS ERROR:", error?.message)

    return NextResponse.json(
      { error: "Error cargando transacciones", details: error?.message },
      { status: 500 }
    )
  }
}
