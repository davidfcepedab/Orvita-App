import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { requestBelvoDeleteLink } from "@/lib/integrations/banking-colombia"

export const runtime = "nodejs"

type BankProviderCol = "bancolombia" | "davivienda" | "nequi"

function isBankProvider(p: string): p is BankProviderCol {
  return p === "bancolombia" || p === "davivienda" || p === "nequi"
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(_req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { id: rawId } = await ctx.params
    const accountId = rawId?.trim()
    if (!accountId) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
    }

    const { data: row, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("id, provider, metadata")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) throw new Error(fetchError.message)
    if (!row) {
      return NextResponse.json({ success: false, error: "Cuenta no encontrada." }, { status: 404 })
    }

    const provider = String(row.provider ?? "")
    if (!isBankProvider(provider)) {
      return NextResponse.json({ success: false, error: "Proveedor no soportado." }, { status: 400 })
    }

    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const linkFromMeta = typeof meta.belvo_link_id === "string" ? meta.belvo_link_id.trim() : ""

    const { data: connRow } = await supabase
      .from("integration_connections")
      .select("access_token")
      .eq("user_id", userId)
      .eq("integration", provider)
      .maybeSingle()

    const connLinkId = typeof connRow?.access_token === "string" ? connRow.access_token.trim() : ""

    const { error: delError } = await supabase.from("bank_accounts").delete().eq("id", accountId).eq("user_id", userId)
    if (delError) throw new Error(delError.message)

    const { count, error: countError } = await supabase
      .from("bank_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("connected", true)

    if (countError) throw new Error(countError.message)

    if ((count ?? 0) === 0) {
      await supabase.from("integration_connections").delete().eq("user_id", userId).eq("integration", provider)

      const linkToRevoke = connLinkId || linkFromMeta
      if (linkToRevoke) {
        try {
          await requestBelvoDeleteLink({ linkId: linkToRevoke, provider })
        } catch (e) {
          console.warn("[banking] requestBelvoDeleteLink", e)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo desvincular la cuenta"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
