import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { calculateSubtotal } from "@/lib/finanzas/calculations"
import { signedDisplayAmount } from "@/lib/finanzas/calculations/txMath"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

function mapTx(tx: FinanceTransaction) {
  return {
    fecha: tx.date,
    descripcion: tx.description,
    categoria: tx.category,
    subcategoria: tx.subcategory ?? "",
    monto: signedDisplayAmount(tx),
  }
}

export async function GET(req: NextRequest) {
  try {
    const monthParam =
      req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7)

    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ success: false, error: "month debe tener formato YYYY-MM" }, { status: 400 })
    }

    const category = req.nextUrl.searchParams.get("category")
    const subcategory = req.nextUrl.searchParams.get("subcategory")

    const bounds = monthBounds(monthParam)
    if (!bounds) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const { startStr, endStr, prevStartStr, prevEndStr } = bounds

    const filterRows = (rows: FinanceTransaction[]) =>
      rows.filter((tx) => {
        if (category && tx.category !== category) return false
        if (subcategory && (tx.subcategory ?? "") !== subcategory) return false
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
        notice: "NEXT_PUBLIC_SUPABASE_ENABLED≠true: sin movimientos.",
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
