import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import {
  buildCategoryAnalyticsPayload,
  monthsEndingAt,
} from "@/lib/finanzas/categoryAnalyticsEngine"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const monthParam = req.nextUrl.searchParams.get("month")
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ success: false, error: "month requerido (YYYY-MM)" }, { status: 400 })
    }

    const momAlertPct = Number(req.nextUrl.searchParams.get("mom_alert") ?? "15")
    const antShare = Number(req.nextUrl.searchParams.get("ant_share") ?? "0.035")
    const antTicket = Number(req.nextUrl.searchParams.get("ant_ticket") ?? "120000")
    const historyMonths = Math.min(24, Math.max(6, Number(req.nextUrl.searchParams.get("history_months") ?? "18")))

    const anchorBounds = monthBounds(monthParam)
    if (!anchorBounds) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const months = monthsEndingAt(monthParam, historyMonths)
    const firstMonth = months[0]!
    const startBounds = monthBounds(firstMonth)
    if (!startBounds) {
      return NextResponse.json({ success: false, error: "rango inválido" }, { status: 400 })
    }

    let txs: FinanceTransaction[] = []

    if (isAppMockMode()) {
      for (const ym of months) {
        txs = txs.concat(mockTransactionsForMonth(ym))
      }
      const payload = buildCategoryAnalyticsPayload({
        txs,
        anchorMonth: monthParam,
        params: {
          momAlertPct: Number.isFinite(momAlertPct) ? momAlertPct : 15,
          antShareMin: Number.isFinite(antShare) ? antShare : 0.035,
          antTicketMax: Number.isFinite(antTicket) ? antTicket : 120_000,
          historyMonths,
        },
      })
      return NextResponse.json({ success: true, source: "mock", data: payload })
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

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    txs = await getTransactionsByRange(auth.supabase, startBounds.startStr, anchorBounds.endStr)

    const payload = buildCategoryAnalyticsPayload({
      txs,
      anchorMonth: monthParam,
      params: {
        momAlertPct: Number.isFinite(momAlertPct) ? momAlertPct : 15,
        antShareMin: Number.isFinite(antShare) ? antShare : 0.035,
        antTicketMax: Number.isFinite(antTicket) ? antTicket : 120_000,
        historyMonths,
      },
    })

    return NextResponse.json({ success: true, data: payload })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("CATEGORY ANALYTICS:", message)
    return NextResponse.json({ success: false, error: "Error en análisis de categorías" }, { status: 500 })
  }
}
