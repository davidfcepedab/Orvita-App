import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { calculateSubtotal } from "@/lib/finanzas/calculations"
import { incomeAmount, signedDisplayAmount } from "@/lib/finanzas/calculations/txMath"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import type { FinanceTransaction, FinanceTxType } from "@/lib/finanzas/types"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { formatPostgrestError } from "@/lib/finanzas/subcategoryCatalog"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

function isLikelySupabaseRlsDenial(err: unknown): boolean {
  const s = formatPostgrestError(err).toLowerCase()
  return (
    s.includes("row-level security") ||
    s.includes("violates row-level security") ||
    (s.includes("policy") && s.includes("violat"))
  )
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function resolvedTxType(tx: FinanceTransaction): FinanceTxType {
  if (tx.type === "income" || tx.type === "expense") return tx.type
  return incomeAmount(tx) > 0 ? "income" : "expense"
}

function mapTx(tx: FinanceTransaction) {
  return {
    id: tx.id,
    fecha: tx.date,
    descripcion: tx.description,
    categoria: tx.category,
    subcategoria: tx.subcategory ?? "",
    cuenta: (tx.account_label ?? "").trim(),
    monto: signedDisplayAmount(tx),
    tipo: resolvedTxType(tx),
  }
}

export async function GET(req: NextRequest) {
  try {
    const monthParam = req.nextUrl.searchParams.get("month")
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json(
        { success: false, error: "month requerido (YYYY-MM)" },
        { status: 400 },
      )
    }

    const category = req.nextUrl.searchParams.get("category")
    const subcategory = req.nextUrl.searchParams.get("subcategory")
    const tipoParam = req.nextUrl.searchParams.get("tipo")?.trim().toLowerCase() ?? ""
    const tipoFilter: "income" | "expense" | null =
      tipoParam === "ingreso" || tipoParam === "income"
        ? "income"
        : tipoParam === "gasto" || tipoParam === "expense"
          ? "expense"
          : null
    const financeAccountId = req.nextUrl.searchParams.get("finance_account_id")?.trim() ?? ""
    if (financeAccountId && !UUID_RE.test(financeAccountId)) {
      return NextResponse.json(
        { success: false, error: "finance_account_id debe ser un UUID válido" },
        { status: 400 },
      )
    }

    const bounds = monthBounds(monthParam)
    if (!bounds) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const { startStr, endStr, prevStartStr, prevEndStr } = bounds

    const filterRows = (rows: FinanceTransaction[]) =>
      rows.filter((tx) => {
        if (category && tx.category !== category) return false
        if (subcategory && (tx.subcategory ?? "") !== subcategory) return false
        if (financeAccountId && (tx.finance_account_id ?? "").trim() !== financeAccountId) return false
        if (tipoFilter && resolvedTxType(tx) !== tipoFilter) return false
        return true
      })

    if (isAppMockMode()) {
      const all = mockTransactionsForMonth(monthParam).filter(
        (r) => r.date >= startStr && r.date <= endStr,
      )
      const prevAll = mockTransactionsForMonth(monthParam).filter(
        (r) => r.date >= prevStartStr && r.date <= prevEndStr,
      )
      const filteredRows = filterRows(all)
      const prevFiltered = filterRows(prevAll)
      const subtotal = calculateSubtotal(filteredRows)
      const previousSubtotal = calculateSubtotal(prevFiltered)
      const delta = previousSubtotal !== 0 ? subtotal - previousSubtotal : null
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          transactions: filteredRows.map(mapTx),
          subtotal,
          previousSubtotal,
          delta,
        },
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: { transactions: [], subtotal: 0, previousSubtotal: 0, delta: null },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const monthRows = await getTransactionsByRange(auth.supabase, startStr, endStr)
    const prevRows = await getTransactionsByRange(auth.supabase, prevStartStr, prevEndStr)

    const filteredRows = filterRows(monthRows)
    const prevFiltered = filterRows(prevRows)

    const subtotal = calculateSubtotal(filteredRows)
    const previousSubtotal = calculateSubtotal(prevFiltered)
    const delta = Math.abs(previousSubtotal) > 1e-6 ? subtotal - previousSubtotal : null

    return NextResponse.json({
      success: true,
      data: {
        transactions: filteredRows.map(mapTx),
        subtotal,
        previousSubtotal,
        delta,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando transacciones" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: false, error: "No disponible en modo demo" }, { status: 400 })
    }
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 400 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as {
      id?: string
      category?: string
      subcategory?: string | null
      type?: string
    }

    const id = String(body.id ?? "").trim()
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: "id inválido" }, { status: 400 })
    }

    const { data: existing, error: fetchErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .select("id, household_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!existing || String(existing.household_id) !== String(householdId)) {
      return NextResponse.json({ success: false, error: "Movimiento no encontrado" }, { status: 404 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.category !== undefined) patch.category = String(body.category).trim()
    if (body.subcategory !== undefined) {
      patch.subcategory =
        body.subcategory === null || body.subcategory === ""
          ? null
          : String(body.subcategory).trim()
    }
    if (body.type === "income" || body.type === "expense") {
      patch.type = body.type
    }

    const patchKeys = Object.keys(patch).filter((k) => k !== "updated_at")
    if (patchKeys.length === 0) {
      return NextResponse.json({ success: false, error: "Nada que actualizar" }, { status: 400 })
    }

    const { data: updated, error: upErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdId)
      .select("*")
      .maybeSingle()

    if (upErr) throw upErr
    if (!updated) {
      return NextResponse.json({ success: false, error: "No se pudo actualizar" }, { status: 404 })
    }

    const row = updated as FinanceTransaction
    return NextResponse.json({
      success: true,
      data: { transaction: mapTx(row) },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS PATCH:", message)
    return NextResponse.json({ success: false, error: "Error actualizando movimiento" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: false, error: "No disponible en modo demo" }, { status: 400 })
    }
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 400 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get("id")?.trim() ?? ""
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: "id inválido" }, { status: 400 })
    }

    const { data: existing, error: fetchErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .select("id, household_id, description")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!existing || String(existing.household_id) !== String(householdId)) {
      return NextResponse.json({ success: false, error: "Movimiento no encontrado" }, { status: 404 })
    }

    if (!/reconciliation_adjustment/i.test(String(existing.description ?? ""))) {
      return NextResponse.json(
        { success: false, error: "Solo se pueden eliminar ajustes de conciliación" },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const { error: upErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", id)
      .eq("household_id", householdId)

    if (upErr) throw upErr

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS DELETE:", message, error)
    if (isLikelySupabaseRlsDenial(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La base de datos rechazó el borrado (RLS/audit). En Supabase ejecuta la migración 20260403180000 (row_security off en el trigger) o supabase db push.",
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ success: false, error: "Error eliminando movimiento" }, { status: 500 })
  }
}

const BULK_RECONCILIATION_DELETE_MAX = 80

/** Borrado múltiple solo de ajustes de conciliación (misma regla que DELETE unitario). */
export async function POST(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: false, error: "No disponible en modo demo" }, { status: 400 })
    }
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 400 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as { deleteReconciliationAdjustmentIds?: unknown }
    const raw = body.deleteReconciliationAdjustmentIds
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { success: false, error: "deleteReconciliationAdjustmentIds debe ser un array no vacío" },
        { status: 400 },
      )
    }

    const ids = [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))]
    if (ids.length > BULK_RECONCILIATION_DELETE_MAX) {
      return NextResponse.json(
        { success: false, error: `Máximo ${BULK_RECONCILIATION_DELETE_MAX} movimientos por solicitud` },
        { status: 400 },
      )
    }

    for (const id of ids) {
      if (!UUID_RE.test(id)) {
        return NextResponse.json({ success: false, error: `id inválido: ${id}` }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const skipped: string[] = []

    const { data: rows, error: selErr } = await auth.supabase
      .from("orbita_finance_transactions")
      .select("id, household_id, description")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .in("id", ids)

    if (selErr) throw selErr

    type Row = { id: string; household_id?: string; description?: string | null }
    const rowById = new Map<string, Row>((rows ?? []).map((r) => [String((r as Row).id), r as Row]))

    const eligible: string[] = []
    for (const id of ids) {
      const row = rowById.get(id)
      if (!row) {
        skipped.push(id)
        continue
      }
      if (!/reconciliation_adjustment/i.test(String(row.description ?? ""))) {
        skipped.push(id)
        continue
      }
      eligible.push(id)
    }

    if (eligible.length > 0) {
      const { error: upErr } = await auth.supabase
        .from("orbita_finance_transactions")
        .update({ deleted_at: now, updated_at: now })
        .in("id", eligible)
        .eq("household_id", householdId)

      if (upErr) throw upErr
    }

    return NextResponse.json({
      success: true,
      data: { deleted: eligible, skipped },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS POST bulk:", message, error)
    if (isLikelySupabaseRlsDenial(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La base de datos rechazó el borrado (RLS/audit). Ejecuta en Supabase 20260403180000 o supabase db push.",
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ success: false, error: "Error eliminando movimientos" }, { status: 500 })
  }
}
