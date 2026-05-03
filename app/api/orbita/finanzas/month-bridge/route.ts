import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { buildCompleteMonthFinanceCoherence } from "@/lib/finanzas/monthFinanceCoherence"
import type { MonthBridgeEntryLite } from "@/lib/finanzas/monthFinanceCoherence"
import {
  fetchReconciliationHintEma,
  HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA,
  upsertUnexplainedGapEma,
} from "@/lib/finanzas/reconciliationHints"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import { monthBounds } from "@/lib/finanzas/monthRange"

export const runtime = "nodejs"

function mapBridgeRow(r: {
  id: unknown
  bridge_kind: unknown
  amount_cop: unknown
  label: unknown
}): MonthBridgeEntryLite | null {
  const id = typeof r.id === "string" ? r.id : null
  const kind = r.bridge_kind === "other" ? "other" : "kpi_structural"
  const amount = Number(r.amount_cop)
  const label = typeof r.label === "string" ? r.label : ""
  if (!id || !Number.isFinite(amount)) return null
  return { id, bridge_kind: kind, amount_cop: amount, label }
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: "month requerido (YYYY-MM)" }, { status: 400 })
    }

    if (isAppMockMode()) {
      return NextResponse.json({ success: true, source: "mock", entries: [] as MonthBridgeEntryLite[] })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: true, notice: UI_SYNC_OFF_SHORT, entries: [] })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const [yStr, mStr] = month.split("-")
    const y = Number(yStr)
    const mo = Number(mStr)

    const { data, error } = await auth.supabase
      .from("household_finance_month_bridge_entries")
      .select("id, bridge_kind, amount_cop, label")
      .eq("household_id", householdId)
      .eq("year", y)
      .eq("month", mo)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("MONTH_BRIDGE GET:", error)
      return NextResponse.json({ success: false, error: "No se pudieron cargar los puentes" }, { status: 500 })
    }

    const entries = (data ?? []).map((r) => mapBridgeRow(r)).filter((x): x is MonthBridgeEntryLite => x != null)

    return NextResponse.json({ success: true, entries })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error"
    console.error("MONTH_BRIDGE GET:", message)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({ success: true, source: "mock", id: "mock-bridge" })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as {
      month?: string
      bridge_kind?: string
      amount_cop?: number
      label?: string
      note?: string | null
    }

    const month = body.month
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const amount = Number(body.amount_cop)
    if (!Number.isFinite(amount)) {
      return NextResponse.json({ success: false, error: "amount_cop numérico requerido" }, { status: 400 })
    }

    const bridgeKind = body.bridge_kind === "other" ? "other" : "kpi_structural"
    const label = typeof body.label === "string" ? body.label.trim() : ""
    const note = typeof body.note === "string" ? body.note.trim() : null

    const [yStr, mStr] = month.split("-")
    const y = Number(yStr)
    const mo = Number(mStr)

    const { data: inserted, error: insErr } = await auth.supabase
      .from("household_finance_month_bridge_entries")
      .insert({
        household_id: householdId,
        year: y,
        month: mo,
        bridge_kind: bridgeKind,
        amount_cop: amount,
        label: label || "Puente",
        note: note || null,
      })
      .select("id")
      .maybeSingle()

    if (insErr || !inserted?.id) {
      console.error("MONTH_BRIDGE POST insert:", insErr)
      return NextResponse.json({ success: false, error: "No se pudo guardar el puente" }, { status: 500 })
    }

    const bounds = monthBounds(month)
    if (!bounds) {
      return NextResponse.json({ success: true, id: inserted.id })
    }

    const { startStr, endStr, prevStartStr, prevEndStr } = bounds
    let catalogRows: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
    try {
      catalogRows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    } catch {
      /* empty */
    }

    const rangeRows = await getTransactionsByRange(auth.supabase, prevStartStr, endStr, { householdId })
    const currentRows = rangeRows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previousRows = rangeRows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const { data: bridgeRows } = await auth.supabase
      .from("household_finance_month_bridge_entries")
      .select("id, bridge_kind, amount_cop, label")
      .eq("household_id", householdId)
      .eq("year", y)
      .eq("month", mo)

    const entries = (bridgeRows ?? []).map((r) => mapBridgeRow(r)).filter((x): x is MonthBridgeEntryLite => x != null)

    const hintEma = await fetchReconciliationHintEma(auth.supabase, householdId, HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA)

    const coherence =
      currentRows.length > 0
        ? buildCompleteMonthFinanceCoherence(currentRows, previousRows, catalogRows, entries, hintEma)
        : null

    if (coherence) {
      await upsertUnexplainedGapEma(auth.supabase, householdId, coherence.unexplainedKpiStructural)
    }

    return NextResponse.json({ success: true, id: inserted.id })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error"
    console.error("MONTH_BRIDGE POST:", message)
    return NextResponse.json({ success: false, error: "Error guardando puente" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })
    }

    if (isAppMockMode()) {
      return NextResponse.json({ success: true, source: "mock" })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const { error } = await auth.supabase
      .from("household_finance_month_bridge_entries")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId)

    if (error) {
      console.error("MONTH_BRIDGE DELETE:", error)
      return NextResponse.json({ success: false, error: "No se pudo eliminar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error"
    console.error("MONTH_BRIDGE DELETE:", message)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}
