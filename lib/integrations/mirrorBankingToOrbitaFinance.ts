import type { SupabaseClient } from "@supabase/supabase-js"
import type { BankingTransactionResult } from "@/lib/integrations/banking-colombia"
import { ensureFinanceAccountsForLabels } from "@/lib/finanzas/ensureFinanceAccountsForLabels"
import { orbitaLedgerLabelForBankAccount } from "@/lib/integrations/orbitaLedgerLabel"

type BankAccountRow = {
  id: string
  account_name: string
  account_mask: string
  metadata: unknown
}

function readOrbitaFinanceAccountId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const id = (metadata as { orbita_finance_account_id?: unknown }).orbita_finance_account_id
  return typeof id === "string" && id.trim() ? id.trim() : null
}

function sanitizeCategory(raw: string): string {
  const s = raw.trim() || "sin_categoria"
  return s.replace(/_/g, " ").slice(0, 80)
}

/**
 * Resuelve UUID de `orbita_finance_accounts` para una fila `bank_accounts`, creando la cuenta si falta.
 */
export async function resolveOrbitaFinanceAccountIdForBankAccount(
  supabase: SupabaseClient,
  householdId: string,
  account: BankAccountRow,
): Promise<string | null> {
  const existing = readOrbitaFinanceAccountId(account.metadata)
  if (existing) return existing

  const label = orbitaLedgerLabelForBankAccount(account)
  const map = await ensureFinanceAccountsForLabels(supabase, householdId, [label])
  return map.get(label.toLowerCase()) ?? null
}

/**
 * Inserta en `orbita_finance_transactions` los movimientos Belvo recién traídos (misma tanda que `transactions`).
 * Dedupe por (household_id, sync_source, sync_external_id).
 */
export async function mirrorBelvoTransactionsToOrbitaLedger(input: {
  supabase: SupabaseClient
  userId: string
  householdId: string
  bankAccount: BankAccountRow
  financeAccountId: string
  accountLabel: string
  providerLabel: string
  txs: BankingTransactionResult[]
}): Promise<{ orbitaInserted: number; snapshotMonthsTouched: string[] }> {
  const { supabase, userId, householdId, financeAccountId, accountLabel, providerLabel, txs } = input
  if (txs.length === 0) return { orbitaInserted: 0, snapshotMonthsTouched: [] }

  const withIds = txs.filter((t) => Boolean(t.externalId?.trim()))
  let existingExt = new Set<string>()
  if (withIds.length > 0) {
    const extIds = [...new Set(withIds.map((t) => String(t.externalId).trim()))]
    const { data: existingRows, error } = await supabase
      .from("orbita_finance_transactions")
      .select("sync_external_id")
      .eq("household_id", householdId)
      .eq("sync_source", "belvo")
      .in("sync_external_id", extIds)
      .is("deleted_at", null)

    if (error) throw new Error(error.message)
    existingExt = new Set(
      (existingRows ?? [])
        .map((r) => (r as { sync_external_id?: string }).sync_external_id)
        .filter(Boolean) as string[],
    )
  }

  const fresh = txs.filter((t) => {
    const ext = t.externalId?.trim()
    if (!ext) return true
    return !existingExt.has(ext)
  })

  if (fresh.length === 0) return { orbitaInserted: 0, snapshotMonthsTouched: [] }

  const now = new Date().toISOString()
  const months = new Set<string>()

  const payload = fresh.map((tx) => {
    const day = tx.postedAt.slice(0, 10)
    months.add(day.slice(0, 7))
    const type = tx.direction === "credit" ? "income" : "expense"
    const cat = sanitizeCategory(tx.category)
    return {
      household_id: householdId,
      profile_id: userId,
      date: day,
      description: tx.description.trim() || "Movimiento bancario",
      category: "Banca abierta",
      subcategory: cat,
      account_label: accountLabel,
      finance_account_id: financeAccountId,
      amount: Math.abs(tx.amount),
      type,
      currency: "COP",
      sync_source: "belvo",
      sync_external_id: tx.externalId?.trim() || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
  })

  const { error: insErr } = await supabase.from("orbita_finance_transactions").insert(payload)
  if (insErr) throw new Error(insErr.message)

  return {
    orbitaInserted: payload.length,
    snapshotMonthsTouched: [...months],
  }
}

export async function rebuildSnapshotsForMonths(
  supabase: SupabaseClient,
  householdId: string,
  ymKeys: string[],
) {
  const seen = new Set<string>()
  for (const ym of ymKeys) {
    if (!/^\d{4}-\d{2}$/.test(ym) || seen.has(ym)) continue
    seen.add(ym)
    const [yStr, mStr] = ym.split("-")
    const y = Number(yStr)
    const m = Number(mStr)
    if (!Number.isFinite(y) || m < 1 || m > 12) continue
    const { error } = await supabase.rpc("rebuild_month_snapshot", {
      p_household: householdId,
      p_year: y,
      p_month: m,
    })
    if (error) {
      console.warn("[mirrorBankingToOrbitaFinance] rebuild_month_snapshot", ym, error.message)
    }
  }
}
