import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: { rows: [] as unknown[] },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    return NextResponse.json({ success: true, data: { rows } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("SUBCATEGORY_CATALOG ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando catálogo" }, { status: 500 })
  }
}
