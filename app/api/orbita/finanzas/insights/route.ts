import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { buildInsightsFromHistory } from "@/lib/finanzas/deriveFromTransactions"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

function shiftMonth(m: string, delta: number) {
  const [ys, ms] = m.split("-").map(Number)
  const d = new Date(ys, ms - 1 + delta, 1)
  const y = d.getFullYear()
  const mo = d.getMonth() + 1
  return `${y}-${String(mo).padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: "month requerido (YYYY-MM)" },
        { status: 400 },
      )
    }

    const slices: { month: string; rows: FinanceTransaction[] }[] = []

    if (isAppMockMode()) {
      for (let i = 5; i >= 0; i -= 1) {
        const mk = shiftMonth(month, -i)
        const b = monthBounds(mk)
        if (!b) continue
        const all = mockTransactionsForMonth(mk)
        const rows = all.filter((r) => r.date >= b.startStr && r.date <= b.endStr)
        slices.push({ month: mk, rows })
      }
      const data = buildInsightsFromHistory(slices)
      return NextResponse.json({ success: true, source: "mock", data })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: null,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    for (let i = 5; i >= 0; i -= 1) {
      const mk = shiftMonth(month, -i)
      const b = monthBounds(mk)
      if (!b) continue
      const rows = await getTransactionsByRange(auth.supabase, b.startStr, b.endStr)
      slices.push({ month: mk, rows })
    }

    const data = buildInsightsFromHistory(slices)
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("INSIGHTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando insights" }, { status: 500 })
  }
}
