import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { buildCuentasDashboard } from "@/lib/finanzas/cuentasDashboard"
import { mergeLiveDashboardWithLedger } from "@/lib/finanzas/dashboardFromLedgerAccounts"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { ledgerRollupRangeStart, monthBounds } from "@/lib/finanzas/monthRange"
import { sortLedgerAccountsForDisplay } from "@/lib/finanzas/sortLedgerAccounts"
import { buildSyntheticAccounts } from "@/lib/finanzas/syntheticAccounts"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: "month requerido (YYYY-MM)" },
        { status: 400 },
      )
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
      return NextResponse.json({
        success: true,
        source: "mock",
        data: { accounts, dashboard, ledgerAccounts: [] as unknown[] },
      })
    }

    if (!isSupabaseEnabled()) {
      const dashboard = buildCuentasDashboard(month, null, [], [], false)
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: { accounts: [], dashboard, ledgerAccounts: [] as unknown[] },
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

    const [rows, prevRows, ledgerRollupRows] = await Promise.all([
      getTransactionsByRange(auth.supabase, b.startStr, b.endStr),
      getTransactionsByRange(auth.supabase, b.prevStartStr, b.prevEndStr),
      getTransactionsByRange(auth.supabase, ledgerRollupRangeStart(month), b.endStr),
    ])
    const balance = snapshot?.balance != null ? Number(snapshot.balance) : null
    const accounts = buildSyntheticAccounts(month, balance, rows)
    const dashboardBase = buildCuentasDashboard(month, balance, rows, prevRows, false)

    let ledgerAccounts: unknown[] = []
    const { data: ledgerRows, error: ledgerErr } = await auth.supabase
      .from("orbita_finance_accounts")
      .select(
        "id, label, account_class, nature, credit_limit, balance_used, balance_available, manual_balance, manual_balance_on, owner_user_id, sort_order, updated_at",
      )
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })

    let dashboard = dashboardBase
    if (!ledgerErr) {
      const sortedLedger = sortLedgerAccountsForDisplay(ledgerRows ?? [], rows)
      ledgerAccounts = sortedLedger
      dashboard = mergeLiveDashboardWithLedger(dashboardBase, month, sortedLedger, rows, ledgerRollupRows)
    } else if (!/does not exist|PGRST205/i.test(ledgerErr.message ?? "")) {
      console.warn("ACCOUNTS: ledger query:", ledgerErr.message)
    }

    return NextResponse.json({ success: true, data: { accounts, dashboard, ledgerAccounts } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("ACCOUNTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando cuentas" }, { status: 500 })
  }
}
