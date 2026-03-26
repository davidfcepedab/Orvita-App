import { NextRequest, NextResponse } from "next/server"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import { calculateSubtotal } from "@/lib/finanzas/calculations"

export async function GET(req: NextRequest) {
  try {
    const monthParam =
      req.nextUrl.searchParams.get("month") ||
      new Date().toISOString().slice(0, 7)

    const category = req.nextUrl.searchParams.get("category")
    const subcategory = req.nextUrl.searchParams.get("subcategory")

    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json(
        { success: false, error: "month debe tener formato YYYY-MM" },
        { status: 400 }
      )
    }

    const [yearStr, monthStr] = monthParam.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr)

    const startDate = `${monthParam}-01`
    const endDate = new Date(year, month, 0)
      .toISOString()
      .split("T")[0]

    const allRows = await getTransactionsByRange(startDate, endDate)

    const filteredRows = allRows.filter((tx: any) => {
      if (category && tx.category !== category) return false
      if (subcategory && tx.subcategory !== subcategory) return false
      return true
    })

    const subtotal = calculateSubtotal(filteredRows)

    return NextResponse.json({
      success: true,
      data: {
        transactions: filteredRows,
        subtotal,
        previousSubtotal: null,
        delta: null,
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
