import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { sortLedgerAccountsForDisplay } from "@/lib/finanzas/sortLedgerAccounts"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: { accounts: [] as unknown[] },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const { data, error } = await auth.supabase
      .from("orbita_finance_accounts")
      .select(
        "id, label, account_class, nature, credit_limit, balance_used, balance_available, manual_balance, manual_balance_on, creditos_extras, balance_reconciliation_adjustment, reconciliation_note, owner_user_id, sort_order, updated_at",
      )
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          notice: "Tabla orbita_finance_accounts no aplicada aún en este proyecto.",
          data: { accounts: [] },
        })
      }
      throw error
    }

    const rows = data ?? []
    const monthQ = req.nextUrl.searchParams.get("month")
    const b = monthQ ? monthBounds(monthQ) : null
    const monthRows =
      b != null ? await getTransactionsByRange(auth.supabase, b.startStr, b.endStr) : []
    const accounts = sortLedgerAccountsForDisplay(rows, monthRows)

    return NextResponse.json({ success: true, data: { accounts } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("LEDGER_ACCOUNTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando cuentas contables" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = (await req.json()) as Record<string, unknown>
    const now = new Date().toISOString()

    if (typeof body.accountId === "string" && body.accountId.trim()) {
      const accountId = body.accountId.trim()
      const { data: row, error: oneErr } = await auth.supabase
        .from("orbita_finance_accounts")
        .select("id")
        .eq("id", accountId)
        .eq("household_id", householdId)
        .is("deleted_at", null)
        .maybeSingle()
      if (oneErr) throw oneErr
      if (!row) {
        return NextResponse.json({ success: false, error: "Cuenta no encontrada" }, { status: 404 })
      }

      const patch: Record<string, unknown> = { updated_at: now }
      if (body.manual_balance != null && Number.isFinite(Number(body.manual_balance))) {
        patch.manual_balance = Number(body.manual_balance)
      }
      if (typeof body.manual_balance_on === "string" && body.manual_balance_on.trim()) {
        patch.manual_balance_on = body.manual_balance_on.trim().slice(0, 10)
      }
      if (body.creditos_extras != null && Number.isFinite(Number(body.creditos_extras))) {
        patch.creditos_extras = Math.max(0, Number(body.creditos_extras))
      }
      if (body.balance_reconciliation_adjustment != null && Number.isFinite(Number(body.balance_reconciliation_adjustment))) {
        patch.balance_reconciliation_adjustment = Number(body.balance_reconciliation_adjustment)
      }
      if (typeof body.reconciliation_note === "string") {
        patch.reconciliation_note = body.reconciliation_note.slice(0, 2000) || null
      }

      if (Object.keys(patch).length <= 1) {
        return NextResponse.json(
          { success: false, error: "Nada que actualizar: envía manual_balance, fechas o ajustes." },
          { status: 400 },
        )
      }

      const { error: upErr } = await auth.supabase
        .from("orbita_finance_accounts")
        .update(patch)
        .eq("id", accountId)
        .eq("household_id", householdId)
      if (upErr) {
        if (/column|does not exist|PGRST204/i.test(upErr.message)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Migración pendiente: aplica supabase/migrations con creditos_extras y balance_reconciliation_adjustment.",
            },
            { status: 503 },
          )
        }
        throw upErr
      }
      return NextResponse.json({ success: true })
    }

    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "orderedIds o accountId requerido" },
        { status: 400 },
      )
    }

    const orderedIds = body.orderedIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    if (orderedIds.length !== body.orderedIds.length) {
      return NextResponse.json({ success: false, error: "orderedIds inválido" }, { status: 400 })
    }

    const { data: existing, error: selErr } = await auth.supabase
      .from("orbita_finance_accounts")
      .select("id")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .in("id", orderedIds)

    if (selErr) throw selErr

    const allowed = new Set((existing ?? []).map((r) => r.id))
    for (const id of orderedIds) {
      if (!allowed.has(id)) {
        return NextResponse.json(
          { success: false, error: "Un id no pertenece a cuentas activas del hogar" },
          { status: 400 },
        )
      }
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const { error: upErr } = await auth.supabase
        .from("orbita_finance_accounts")
        .update({ sort_order: i, updated_at: now })
        .eq("id", orderedIds[i])
        .eq("household_id", householdId)
      if (upErr) throw upErr
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("LEDGER_ACCOUNTS PATCH:", message)
    return NextResponse.json({ success: false, error: "Error guardando cuentas ledger" }, { status: 500 })
  }
}
