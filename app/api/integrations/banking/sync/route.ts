import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { createNotificationForUser } from "@/lib/notifications/createNotification"
import { fetchBelvoAccountBalances, isBelvoBankingConfigured, syncBankingColombia } from "@/lib/integrations/banking-colombia"

export const runtime = "nodejs"

type BankProvider = "bancolombia" | "davivienda" | "nequi"

function readBelvoAccountId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const id = (metadata as { belvo_account_id?: unknown }).belvo_account_id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { userId, supabase } = auth

    const { data: accounts, error: accountsError } = await supabase
      .from("bank_accounts")
      .select("id,provider,balance_current,account_name,metadata")
      .eq("user_id", userId)
      .eq("connected", true)

    if (accountsError) throw new Error(accountsError.message)
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: false, error: "No hay cuentas conectadas para sincronizar." }, { status: 404 })
    }

    const nowIso = new Date().toISOString()
    let inserted = 0
    let netMonthly = 0

    const byProvider = new Map<BankProvider, typeof accounts>()
    for (const account of accounts) {
      const p = account.provider as BankProvider
      if (!byProvider.has(p)) byProvider.set(p, [])
      byProvider.get(p)!.push(account)
    }

    for (const [provider, providerAccounts] of byProvider) {
      const { data: conn, error: connError } = await supabase
        .from("integration_connections")
        .select("access_token")
        .eq("user_id", userId)
        .eq("integration", provider)
        .eq("connected", true)
        .limit(1)
        .maybeSingle()
      if (connError) throw new Error(connError.message)
      if (!conn?.access_token) {
        throw new Error(`Falta link Belvo para ${provider}. Reconecta la cuenta en Configuración.`)
      }

      const linkId = conn.access_token
      let balanceByBelvoId: Map<string, { balanceAvailable: number; balanceCurrent: number }> | null = null
      if (isBelvoBankingConfigured()) {
        const bals = await fetchBelvoAccountBalances({ provider, linkId })
        balanceByBelvoId = new Map(bals.map((b) => [b.belvoAccountId, b]))
      }

      for (const account of providerAccounts) {
        const belvoAccountId = readBelvoAccountId(account.metadata)

        const externalTx = await syncBankingColombia({
          provider,
          accessToken: linkId,
          belvoAccountId,
        })

        for (const tx of externalTx) {
          const signed = tx.direction === "credit" ? Math.abs(tx.amount) : -Math.abs(tx.amount)
          netMonthly += signed
        }

        let existingIds = new Set<string>()
        if (externalTx.some((t) => t.externalId)) {
          const { data: existingRows, error: exErr } = await supabase
            .from("transactions")
            .select("metadata")
            .eq("bank_account_id", account.id)
            .limit(5000)
          if (exErr) throw new Error(exErr.message)
          existingIds = new Set(
            (existingRows ?? [])
              .map((r) =>
                r.metadata && typeof r.metadata === "object" && "belvo_transaction_id" in r.metadata
                  ? String((r.metadata as { belvo_transaction_id?: string }).belvo_transaction_id ?? "")
                  : "",
              )
              .filter(Boolean),
          )
        }

        const rows = externalTx
          .filter((tx) => !tx.externalId || !existingIds.has(tx.externalId))
          .map((tx) => {
            const signed = tx.direction === "credit" ? Math.abs(tx.amount) : -Math.abs(tx.amount)
            return {
              user_id: userId,
              bank_account_id: account.id,
              posted_at: tx.postedAt,
              description: tx.description,
              amount: Math.abs(tx.amount),
              direction: tx.direction,
              category: tx.category,
              metadata: {
                provider,
                sync: "belvo",
                belvo_transaction_id: tx.externalId,
              },
            }
          })

        if (rows.length > 0) {
          const { error } = await supabase.from("transactions").insert(rows)
          if (error) throw new Error(error.message)
          inserted += rows.length
        }

        let nextBalance: number | null = null
        let nextAvailable: number | null = null
        if (balanceByBelvoId && belvoAccountId) {
          const b = balanceByBelvoId.get(belvoAccountId)
          if (b) {
            nextBalance = b.balanceCurrent
            nextAvailable = b.balanceAvailable
          }
        }

        const patch: Record<string, unknown> = {
          last_synced_at: nowIso,
          updated_at: nowIso,
        }
        if (nextBalance != null) patch.balance_current = nextBalance
        if (nextAvailable != null) patch.balance_available = nextAvailable

        const { error: accountUpdateError } = await supabase.from("bank_accounts").update(patch).eq("id", account.id)
        if (accountUpdateError) throw new Error(accountUpdateError.message)
      }
    }

    const { error: connUpdateError } = await supabase
      .from("integration_connections")
      .update({ last_synced_at: nowIso, updated_at: nowIso })
      .eq("user_id", userId)
      .in("integration", ["bancolombia", "davivienda", "nequi"])
    if (connUpdateError) throw new Error(connUpdateError.message)

    if (netMonthly < 0) {
      const formatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Math.round(netMonthly))
      await createNotificationForUser({
        userId,
        title: "Presión de caja detectada",
        body: `Flujo neto negativo (~${formatted}) en movimientos sincronizados (Belvo). Revisa Capital para conciliar y priorizar salidas.`,
        category: "finance",
        link: "/finanzas/overview",
        metadata: { source: "bank_sync_belvo", netMonthly },
      })
    }

    return NextResponse.json({
      success: true,
      syncedAccounts: accounts.length,
      transactionsImported: inserted,
      netMonthly,
      syncedAt: nowIso,
      integrationBackend: isBelvoBankingConfigured() ? "belvo_sandbox" : "mock",
      statusLabel: accounts.length > 0 ? "Conectado vía Belvo Sandbox" : "No conectado",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar banca"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
