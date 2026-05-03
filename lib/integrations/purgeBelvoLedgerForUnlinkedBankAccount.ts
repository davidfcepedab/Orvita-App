import type { SupabaseClient } from "@supabase/supabase-js"
import { rebuildSnapshotsForMonths } from "@/lib/integrations/mirrorBankingToOrbitaFinance"
import { orbitaLedgerLabelForBankAccount } from "@/lib/integrations/orbitaLedgerLabel"

type BankAccountLike = { account_name: string; account_mask: string; metadata: unknown }

function readFinanceAccountId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const id = (metadata as { orbita_finance_account_id?: unknown }).orbita_finance_account_id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

/**
 * Tras desvincular `bank_accounts`: borra movimientos espejados Belvo en el ledger del hogar
 * y, si el catálogo queda sin movimientos activos, elimina la fila `orbita_finance_accounts`.
 */
export async function purgeBelvoLedgerForUnlinkedBankAccount(input: {
  supabase: SupabaseClient
  householdId: string
  bankAccount: BankAccountLike
}): Promise<{ snapshotMonthsTouched: string[]; catalogAccountRemoved: boolean }> {
  const { supabase, householdId, bankAccount } = input
  const ledgerLabel = orbitaLedgerLabelForBankAccount(bankAccount)
  const financeAccountId = readFinanceAccountId(bankAccount.metadata)

  const months = new Set<string>()
  const collectMonths = async () => {
    let q = supabase
      .from("orbita_finance_transactions")
      .select("date")
      .eq("household_id", householdId)
      .eq("sync_source", "belvo")
      .is("deleted_at", null)
    if (financeAccountId) {
      q = q.eq("finance_account_id", financeAccountId)
    } else {
      q = q.eq("account_label", ledgerLabel)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const d = String((row as { date?: string }).date ?? "").slice(0, 10)
      if (d.length >= 7) months.add(d.slice(0, 7))
    }
  }

  await collectMonths()

  let del = supabase
    .from("orbita_finance_transactions")
    .delete()
    .eq("household_id", householdId)
    .eq("sync_source", "belvo")
    .is("deleted_at", null)
  if (financeAccountId) {
    del = del.eq("finance_account_id", financeAccountId)
  } else {
    del = del.eq("account_label", ledgerLabel)
  }
  const { error: delErr } = await del
  if (delErr) throw new Error(delErr.message)

  const ym = [...months]
  if (ym.length > 0) {
    await rebuildSnapshotsForMonths(supabase, householdId, ym)
  }

  let catalogAccountRemoved = false
  if (financeAccountId) {
    const { count, error: cErr } = await supabase
      .from("orbita_finance_transactions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("finance_account_id", financeAccountId)
      .is("deleted_at", null)
    if (cErr) throw new Error(cErr.message)
    if ((count ?? 0) === 0) {
      const { error: accErr } = await supabase
        .from("orbita_finance_accounts")
        .delete()
        .eq("id", financeAccountId)
        .eq("household_id", householdId)
      if (accErr) throw new Error(accErr.message)
      catalogAccountRemoved = true
    }
  }

  return { snapshotMonthsTouched: ym, catalogAccountRemoved }
}
