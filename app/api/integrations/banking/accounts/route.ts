import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { data: accounts, error } = await supabase
      .from("bank_accounts")
      .select("id,provider,account_name,account_mask,currency,balance_available,balance_current,last_synced_at")
      .eq("user_id", userId)
      .eq("connected", true)
      .order("updated_at", { ascending: false })

    if (error) throw new Error(error.message)

    const lastSyncAt =
      accounts?.reduce<string | null>((latest, row) => {
        if (!row.last_synced_at) return latest
        if (!latest) return row.last_synced_at
        return new Date(row.last_synced_at) > new Date(latest) ? row.last_synced_at : latest
      }, null) ?? null

    return NextResponse.json({
      success: true,
      accounts: accounts ?? [],
      connected: (accounts?.length ?? 0) > 0,
      lastSyncAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer cuentas conectadas"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
