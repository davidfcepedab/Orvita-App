import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

type ApiRow = {
  id: string
  item_kind: string
  data: Record<string, unknown>
}

export function bundleFromManualApiItems(items: ApiRow[]): ManualFinanceBundle {
  const savings: CuentasSavingsCard[] = []
  const creditCards: CuentasCreditCard[] = []
  const loans: CuentasLoanCard[] = []

  for (const row of items) {
    const base = { ...(row.data as object), manualRowId: row.id } as Record<string, unknown>
    if (row.item_kind === "savings") {
      savings.push(base as unknown as CuentasSavingsCard)
    } else if (row.item_kind === "credit_card") {
      creditCards.push(base as unknown as CuentasCreditCard)
    } else if (row.item_kind === "structural_loan") {
      loans.push(base as unknown as CuentasLoanCard)
    }
  }

  return { savings, creditCards, loans, hiddenSyntheticIds: [] }
}
