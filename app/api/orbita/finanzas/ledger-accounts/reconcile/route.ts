import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import {
  computeAccountCalculatedBalanceFromSnapshot,
  reconciliationDelta,
  reconciliationTolerance,
  reconciliationTxTypeForDelta,
  type LedgerAccountClass,
} from "@/lib/finanzas/reconciliation"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isoDay(value: string): string | null {
  const v = value.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: "Supabase desactivado" }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as {
      accountId?: string
      realBalance?: number
      reason?: string
      date?: string
    }
    const accountId = String(body.accountId ?? "").trim()
    if (!UUID_RE.test(accountId)) {
      return NextResponse.json({ success: false, error: "accountId inválido" }, { status: 400 })
    }
    if (!Number.isFinite(Number(body.realBalance))) {
      return NextResponse.json({ success: false, error: "realBalance inválido" }, { status: 400 })
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const reconcileDate = typeof body.date === "string" ? isoDay(body.date) ?? todayIso : todayIso
    const reason = (typeof body.reason === "string" ? body.reason.trim() : "").slice(0, 240)

    const { data: account, error: accErr } = await auth.supabase
      .from("orbita_finance_accounts")
      .select("id, label, account_class, manual_balance, manual_balance_on")
      .eq("id", accountId)
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .maybeSingle()
    if (accErr) throw accErr
    if (!account) {
      return NextResponse.json({ success: false, error: "Cuenta no encontrada" }, { status: 404 })
    }

    const txRows = await getTransactionsByRange(auth.supabase, "2000-01-01", reconcileDate)
    const calculated = computeAccountCalculatedBalanceFromSnapshot(txRows, reconcileDate, account)
    const real = Number(body.realBalance)
    const delta = reconciliationDelta(real, calculated)
    const tolerance = reconciliationTolerance(real)

    if (Math.abs(delta) <= tolerance) {
      return NextResponse.json({
        success: true,
        data: {
          accountId,
          reconcileDate,
          calculatedBalance: calculated,
          realBalance: real,
          delta: 0,
          tolerance,
          inserted: false,
        },
      })
    }

    const accountClass = account.account_class as LedgerAccountClass
    const type = reconciliationTxTypeForDelta(accountClass, delta)
    const amount = Math.abs(delta)
    const now = new Date().toISOString()
    const compactReason = reason || "Conciliación manual asistida"
    const description = `[reconciliation_adjustment|manual_sync|origin:user] ${account.label} · Δ ${delta >= 0 ? "+" : ""}${delta} · ${compactReason}`

    const payload = {
      household_id: householdId,
      profile_id: auth.userId,
      date: reconcileDate,
      description,
      amount,
      type,
      category: "Ajustes",
      subcategory: "manual_sync",
      account_label: account.label,
      finance_account_id: account.id,
      currency: "USD",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }

    const { data: inserted, error: insErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .insert(payload)
      .select("id, amount, type, date, description")
      .maybeSingle()
    if (insErr) throw insErr

    const from30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { count: adjustmentsLast30d } = await auth.supabase
      .from("orbita_finance_transactions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("finance_account_id", account.id)
      .gte("date", from30d)
      .lte("date", reconcileDate)
      .ilike("description", "[reconciliation_adjustment%")
      .is("deleted_at", null)

    const deltaPct = Math.abs(real) > 1e-6 ? Math.abs(delta) / Math.abs(real) : 1
    const needsAttention = deltaPct > 0.05 || Number(adjustmentsLast30d ?? 0) > 3

    const note = `[${now}] reconciliation_adjustment delta=${delta} target=${real} calc=${calculated} tol=${tolerance} adjustments_30d=${Number(adjustmentsLast30d ?? 0)} alert=${needsAttention} by=${auth.userId} reason=${compactReason}`
    await auth.supabase
      .from("orbita_finance_accounts")
      .update({
        reconciliation_note: note.slice(0, 2000),
        manual_balance: real,
        manual_balance_on: reconcileDate,
        updated_at: now,
      })
      .eq("id", account.id)
      .eq("household_id", householdId)

    return NextResponse.json({
      success: true,
      data: {
        accountId,
        reconcileDate,
        calculatedBalance: calculated,
        realBalance: real,
        delta,
        tolerance,
        inserted: true,
        adjustmentsLast30d: Number(adjustmentsLast30d ?? 0),
        needsAttention,
        transaction: inserted,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("LEDGER_RECONCILE POST:", message)
    return NextResponse.json({ success: false, error: "Error conciliando cuenta" }, { status: 500 })
  }
}
