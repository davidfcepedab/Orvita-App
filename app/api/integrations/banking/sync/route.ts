import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import { syncBankingColombia } from "@/lib/integrations/banking-colombia"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { data: accounts, error: accountsError } = await supabase
      .from("bank_accounts")
      .select("id,provider,balance_current,account_name")
      .eq("user_id", userId)
      .eq("connected", true)

    if (accountsError) throw new Error(accountsError.message)
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: false, error: "No hay cuentas conectadas para sincronizar." }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    let inserted = 0
    let netMonthly = 0

    for (const account of accounts) {
      const { data: conn, error: connError } = await supabase
        .from("integration_connections")
        .select("access_token")
        .eq("user_id", userId)
        .eq("integration", account.provider)
        .eq("connected", true)
        .limit(1)
        .maybeSingle()
      if (connError) throw new Error(connError.message)
      if (!conn?.access_token) {
        throw new Error(`Falta token para ${account.provider}. Reconecta la cuenta en Configuración.`)
      }

      const externalTx = await syncBankingColombia({
        provider: account.provider as "bancolombia" | "davivienda" | "nequi",
        accessToken: conn.access_token,
      })

      const rows = externalTx.map((tx) => {
        const signed = tx.direction === "credit" ? Math.abs(tx.amount) : -Math.abs(tx.amount)
        netMonthly += signed
        return {
          user_id: userId,
          bank_account_id: account.id,
          posted_at: tx.postedAt,
          description: tx.description,
          amount: Math.abs(tx.amount),
          direction: tx.direction,
          category: tx.category,
          metadata: { provider: account.provider, sync: "real_adapter_v1" },
        }
      })
      const { error } = await supabase.from("transactions").insert(rows)
      if (error) throw new Error(error.message)
      inserted += rows.length

      const { error: accountUpdateError } = await supabase
        .from("bank_accounts")
        .update({
          balance_current:
            Number(account.balance_current ?? 0) +
            rows.reduce((sum, row) => sum + (row.direction === "credit" ? row.amount : -row.amount), 0),
          last_synced_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", account.id)
      if (accountUpdateError) throw new Error(accountUpdateError.message)
    }

    const { error: connUpdateError } = await supabase
      .from("integration_connections")
      .update({ last_synced_at: nowIso, updated_at: nowIso })
      .eq("user_id", userId)
      .in("integration", ["bancolombia", "davivienda", "nequi"])
    if (connUpdateError) throw new Error(connUpdateError.message)

    if (netMonthly < 0) {
      await createNotificationForUser({
        userId,
        title: "Presión de caja detectada",
        body: "Tus movimientos conectados muestran flujo neto negativo. Revisa Capital para conciliar.",
        category: "finance",
        link: "/finanzas/overview",
        metadata: { source: "bank_sync", netMonthly },
      })
    }

    return NextResponse.json({
      success: true,
      syncedAccounts: accounts.length,
      transactionsImported: inserted,
      netMonthly,
      syncedAt: nowIso,
      statusLabel: accounts.length > 0 ? `Conectado a ${accounts[0]?.provider ?? "banco"}` : "No conectado",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar banca"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
