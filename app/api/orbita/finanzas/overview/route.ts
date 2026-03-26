import { NextRequest, NextResponse } from "next/server"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")

    if (!month) {
      return NextResponse.json(
        { success: false, error: "month required (YYYY-MM)" },
        { status: 400 }
      )
    }

    const [year, m] = month.split("-").map(Number)

    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 0)

    const prevStart = new Date(year, m - 2, 1)

    const rows = await getTransactionsByRange(
      prevStart.toISOString().split("T")[0],
      end.toISOString().split("T")[0]
    )

    const startStr = start.toISOString().split("T")[0]
    const prevStartStr = prevStart.toISOString().split("T")[0]

    const currentRows = rows.filter(
      (r: { date: string }) => r.date >= startStr
    )

    const previousRows = rows.filter(
      (r: { date: string }) =>
        r.date >= prevStartStr &&
        r.date < startStr
    )

    const data = calculateOverview(currentRows, previousRows)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("OVERVIEW ERROR:", error?.message)

    return NextResponse.json(
      { success: false, error: "Error cargando overview" },
      { status: 500 }
    )
  }
}