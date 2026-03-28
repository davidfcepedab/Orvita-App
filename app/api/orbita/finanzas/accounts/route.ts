import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { buildCuentasDashboard } from "@/lib/finanzas/cuentasDashboard"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { buildSyntheticAccounts } from "@/lib/finanzas/syntheticAccounts"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const b = monthBounds(month)
    if (!b) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const [y, mo] = month.split("-").map(Number)

    if (isAppMockMode()) {
      const rows = mockTransactionsForMonth(month).filter((r) => r.date >= b.startStr && r.date <= b.endStr)
      const prevMonth = b.prevStartStr.slice(0, 7)
      const prevRows = mockTransactionsForMonth(prevMonth).filter(
        (r) => r.date >= b.prevStartStr && r.date <= b.prevEndStr,
      )
      const accounts = buildSyntheticAccounts(month, 8_200_000, mockTransactionsForMonth(month))
      const dashboard = buildCuentasDashboard(month, 8_200_000, rows, prevRows, true)
      return NextResponse.json({ success: true, source: "mock", data: { accounts, dashboard } })
    }

    if (!isSupabaseEnabled()) {
      const dashboard = buildCuentasDashboard(month, null, [], [], false)
      return NextResponse.json({
        success: true,
        notice: "NEXT_PUBLIC_SUPABASE_ENABLED≠true.",
        data: { accounts: [], dashboard },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const { data: snapshot } = await auth.supabase
      .from("finance_monthly_snapshots")
      .select("balance")
      .eq("household_id", householdId)
      .eq("year", y)
      .eq("month", mo)
      .maybeSingle()

    const rows = await getTransactionsByRange(auth.supabase, b.startStr, b.endStr)
    const prevRows = await getTransactionsByRange(auth.supabase, b.prevStartStr, b.prevEndStr)
    const balance = snapshot?.balance != null ? Number(snapshot.balance) : null
    const accounts = buildSyntheticAccounts(month, balance, rows)
    const dashboard = buildCuentasDashboard(month, balance, rows, prevRows, false)

    return NextResponse.json({ success: true, data: { accounts, dashboard } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("ACCOUNTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando cuentas" }, { status: 500 })
  }
}
