import type { CuentasDashboardPayload } from "@/lib/finanzas/cuentasDashboard"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

/** Fusiona ítems manuales (local o Supabase) con el dashboard sintético sin eliminar filas base innecesariamente. */
export function mergeCuentasDashboard(
  base: CuentasDashboardPayload,
  manual: ManualFinanceBundle,
): CuentasDashboardPayload {
  const hide = new Set(manual.hiddenSyntheticIds)
  const mark = (row: { replacesSyntheticId?: string }) => {
    if (row.replacesSyntheticId) hide.add(row.replacesSyntheticId)
  }
  for (const s of manual.savings) mark(s)
  for (const c of manual.creditCards) mark(c)
  for (const l of manual.loans) mark(l)

  return {
    ...base,
    savings: [...base.savings.filter((s) => !hide.has(s.id)), ...manual.savings],
    creditCards: [...base.creditCards.filter((c) => !hide.has(c.id)), ...manual.creditCards],
    loans: [...base.loans.filter((l) => !hide.has(l.id)), ...manual.loans],
  }
}
