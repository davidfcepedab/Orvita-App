import type { SupabaseClient } from "@supabase/supabase-js"
import type { BankingConnectionResult } from "@/lib/integrations/banking-colombia"
import { isBelvoBankingConfigured } from "@/lib/integrations/banking-colombia"
import { ensureFinanceAccountsForLabels } from "@/lib/finanzas/ensureFinanceAccountsForLabels"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { orbitaLedgerLabelForBankAccount } from "@/lib/integrations/orbitaLedgerLabel"

export type BankProviderCol = "bancolombia" | "davivienda" | "nequi"

export async function persistBankingConnectionRows(
  supabase: SupabaseClient,
  userId: string,
  provider: BankProviderCol,
  connectedList: BankingConnectionResult[],
) {
  const nowIso = new Date().toISOString()
  const primary = connectedList[0]
  if (!primary) throw new Error("Sin cuentas para guardar.")

  const linkId = String(primary.metadata.belvo_link_id ?? primary.accessToken)
  const belvoMeta = {
    source: "belvo",
    belvo_link_id: linkId,
    belvo_institution: primary.metadata.belvo_institution,
    ...(typeof primary.metadata.environment === "string" ? { environment: primary.metadata.environment } : {}),
  }

  await supabase.from("integration_connections").delete().eq("user_id", userId).eq("integration", provider)

  const { error: connError } = await supabase.from("integration_connections").upsert(
    {
      user_id: userId,
      integration: provider,
      provider_account_id: linkId,
      access_token: linkId,
      refresh_token: primary.refreshToken,
      connected: true,
      connected_at: nowIso,
      last_synced_at: nowIso,
      metadata: { ...belvoMeta, connector: "belvo" },
      updated_at: nowIso,
    },
    { onConflict: "user_id,integration,provider_account_id" },
  )
  if (connError) throw new Error(connError.message)

  const householdId = await getHouseholdId(supabase, userId)
  let labelToOrbitaId = new Map<string, string>()
  if (householdId) {
    const labels = connectedList.map((c) =>
      orbitaLedgerLabelForBankAccount({ account_name: c.accountName, account_mask: c.accountMask }),
    )
    labelToOrbitaId = await ensureFinanceAccountsForLabels(supabase, householdId, labels)
  }

  for (const connected of connectedList) {
    const belvoAccountId = String(connected.metadata.belvo_account_id ?? connected.providerAccountId)
    const ledgerLabel = orbitaLedgerLabelForBankAccount({
      account_name: connected.accountName,
      account_mask: connected.accountMask,
    })
    const orbitaFinanceAccountId = labelToOrbitaId.get(ledgerLabel.toLowerCase()) ?? undefined

    const { error: accountError } = await supabase.from("bank_accounts").upsert(
      {
        user_id: userId,
        provider,
        account_name: connected.accountName,
        account_mask: connected.accountMask,
        balance_available: connected.balanceAvailable,
        balance_current: connected.balanceCurrent,
        last_synced_at: nowIso,
        connected: true,
        metadata: {
          ...belvoMeta,
          belvo_account_id: belvoAccountId,
          account_label: connected.accountName,
          ...(orbitaFinanceAccountId ? { orbita_finance_account_id: orbitaFinanceAccountId } : {}),
        },
        updated_at: nowIso,
      },
      { onConflict: "user_id,provider,account_mask" },
    )
    if (accountError) throw new Error(accountError.message)
  }

  return {
    nowIso,
    linkId,
    accountsLinked: connectedList.length,
    connectionLabel: `Conectado vía ${isBelvoBankingConfigured() ? "Belvo Sandbox" : "Belvo"} · ${connectedList.length} cuenta(s)`,
  }
}
