import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"

const LS_KEY = "orbita:manual_finance_items:v1"

export type ManualFinanceBundle = {
  savings: CuentasSavingsCard[]
  creditCards: CuentasCreditCard[]
  loans: CuentasLoanCard[]
  hiddenSyntheticIds: string[]
}

const emptyBundle = (): ManualFinanceBundle => ({
  savings: [],
  creditCards: [],
  loans: [],
  hiddenSyntheticIds: [],
})

export function readManualFinanceFromLocalStorage(): ManualFinanceBundle {
  if (typeof window === "undefined") return emptyBundle()
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return emptyBundle()
    const parsed = JSON.parse(raw) as ManualFinanceBundle
    return {
      savings: Array.isArray(parsed.savings) ? parsed.savings : [],
      creditCards: Array.isArray(parsed.creditCards) ? parsed.creditCards : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      hiddenSyntheticIds: Array.isArray(parsed.hiddenSyntheticIds) ? parsed.hiddenSyntheticIds : [],
    }
  } catch {
    return emptyBundle()
  }
}

export function writeManualFinanceToLocalStorage(bundle: ManualFinanceBundle) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_KEY, JSON.stringify(bundle))
}

export { LS_KEY as MANUAL_FINANCE_LS_KEY }
