import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import { buildTransactionsTemplateXlsxBuffer } from "@/lib/finanzas/transactionsTemplateXlsx"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

export async function GET(_req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      const buf = await buildTransactionsTemplateXlsxBuffer([], [])
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="plantilla-movimientos-orvita.xlsx"',
          "Cache-Control": "no-store",
        },
      })
    }

    const auth = await requireUser(_req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    const { data: accountRows, error: accErr } = await auth.supabase
      .from("orbita_finance_accounts")
      .select("label")
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("label", { ascending: true })

    if (accErr) {
      console.error("TRANSACTIONS_TEMPLATE_ACCOUNTS:", accErr.message)
    }

    const accountLabels = (accountRows ?? [])
      .map((r) => String((r as { label?: string }).label ?? "").trim())
      .filter(Boolean)

    const buf = await buildTransactionsTemplateXlsxBuffer(rows, accountLabels)

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla-movimientos-orvita.xlsx"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("TRANSACTIONS_TEMPLATE_XLSX:", message)
    return NextResponse.json(
      { success: false, error: "No se pudo generar la plantilla", notice: UI_SYNC_OFF_SHORT },
      { status: 500 },
    )
  }
}
