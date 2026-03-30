import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

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
        "id, label, account_class, nature, credit_limit, balance_used, balance_available, manual_balance, manual_balance_on, owner_user_id, sort_order, updated_at",
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

    return NextResponse.json({ success: true, data: { accounts: data ?? [] } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("LEDGER_ACCOUNTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando cuentas contables" }, { status: 500 })
  }
}
