import type { CuentasDashboardPayload } from "@/lib/finanzas/cuentasDashboard"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

/**
 * Capa de presentación sobre `buildCuentasDashboard`: añade/reemplaza tarjetas de ahorro, TC y créditos
 * definidas por el usuario (`household_finance_manual_items` o localStorage). No altera snapshots ni TX en BD.
 * Los montos $0 en ahorros suelen ser ítems manuales sin monto o reparto sintético cuando liquidez base es 0.
 */
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
