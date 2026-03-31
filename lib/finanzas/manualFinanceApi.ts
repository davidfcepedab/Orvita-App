import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"
import { normalizeReplacesSyntheticId } from "@/lib/finanzas/cuentasCardLedgerLink"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

type ApiRow = {
  id: string
  item_kind: string
  data: Record<string, unknown>
}

/** Alinea `replacesSyntheticId` con ids de API (`ledger-{uuid}`) si en JSON solo guardaron el UUID. */
function withNormalizedLedgerReplace<T extends { replacesSyntheticId?: string }>(row: T): T {
  const n = normalizeReplacesSyntheticId(row.replacesSyntheticId)
  if (!n || n === row.replacesSyntheticId) return row
  return { ...row, replacesSyntheticId: n }
}

export function bundleFromManualApiItems(items: ApiRow[]): ManualFinanceBundle {
  const savings: CuentasSavingsCard[] = []
  const creditCards: CuentasCreditCard[] = []
  const loans: CuentasLoanCard[] = []

  for (const row of items) {
    const base = { ...(row.data as object), manualRowId: row.id } as Record<string, unknown>
    if (row.item_kind === "savings") {
      savings.push(withNormalizedLedgerReplace(base as unknown as CuentasSavingsCard))
    } else if (row.item_kind === "credit_card") {
      creditCards.push(withNormalizedLedgerReplace(base as unknown as CuentasCreditCard))
    } else if (row.item_kind === "structural_loan") {
      loans.push(withNormalizedLedgerReplace(base as unknown as CuentasLoanCard))
    }
  }

  return { savings, creditCards, loans, hiddenSyntheticIds: [] }
}
