import { NextRequest, NextResponse } from "next/server"
import { getSheets } from "@/lib/googleAuth"
import {
  filterTransactionRows,
  mapRowToTransaction,
} from "@/lib/mappers/transaction.mapper"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

export async function GET(req: NextRequest) {
  try {
    const sheets = getSheets()
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

    const rows = movimientosRes.data.values || []

    const filtered = filterTransactionRows(rows, month, category)

    const transactions = filtered.map(mapRowToTransaction)

    const subtotal = transactions.reduce(
      (acc, tx) => acc + tx.monto,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        subtotal,
        previousSubtotal: 0,
        delta: 0,
      },
    })

  } catch (error: any) {
    console.error("TRANSACTIONS ERROR:", error?.message)

    return NextResponse.json(
      { success: false, error: "Error cargando transacciones" },
      { status: 500 }
    )
  }
}
