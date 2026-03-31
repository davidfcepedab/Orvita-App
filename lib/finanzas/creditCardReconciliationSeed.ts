import type { CuentasCreditCard } from "@/lib/finanzas/cuentasDashboard"
import { computeDisponibleCuenta } from "@/lib/finanzas/accountBalanceTypes"

/** Semilla inicial por últimos 4 (COP) — alinear Capital con estado real del usuario. */
export const CREDIT_CARD_LAST4_SEED: Record<string, { balance: number; limit: number }> = {
  "5419": { balance: 2_011_719, limit: 25_010_000 },
  "0386": { balance: 1_588_280, limit: 17_500_000 },
  "8696": { balance: 7_084_535, limit: 8_000_000 },
  "9485": { balance: 19_432_002, limit: 19_400_000 },
  "6732": { balance: 13_013_752, limit: 15_000_000 },
}

const SEED_APPLIED_LS = "orbita:credit_reconciliation_seed_v1_applied"

export function isCreditReconciliationSeedApplied(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(SEED_APPLIED_LS) === "1"
  } catch {
    return true
  }
}

export function markCreditReconciliationSeedApplied() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SEED_APPLIED_LS, "1")
  } catch {
    /* ignore */
  }
}

/** Limpia el flag (p. ej. tras `forceSeedReconciliation` en desarrollo). */
export function clearCreditReconciliationSeedFlag() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(SEED_APPLIED_LS)
  } catch {
    /* ignore */
  }
}

function normLast4(s: string) {
  return s.replace(/\D/g, "").slice(-4).padStart(4, "0")
}

/**
 * Aplica montos semilla a tarjetas cuyo last4 coincide. No toca filas con `manualFinancialOverride`.
 * Marca `fuenteDatos: "seed"` y fecha de reconciliación.
 */
export function applyInitialCreditCardSeed(
  cards: CuentasCreditCard[],
  opts?: { force?: boolean },
): CuentasCreditCard[] {
  const force = opts?.force === true
  if (force) clearCreditReconciliationSeedFlag()
  if (!force && isCreditReconciliationSeedApplied()) return cards

  let touched = false
  const today = new Date().toISOString().slice(0, 10)

  const next = cards.map((c) => {
    if (c.manualFinancialOverride) return c
    const k = normLast4(c.last4)
    const seed = CREDIT_CARD_LAST4_SEED[k]
    if (!seed) return c
    touched = true
    const balance = Math.max(0, seed.balance)
    const limit = Math.max(1, seed.limit)
    const usagePct = Math.min(100, Math.round((balance / limit) * 100))
    const cupo = limit
    const uso = -balance
    const extras = Math.max(0, Number(c.creditosExtras ?? 0))
    const adj = Number(c.ajusteManual ?? 0)
    const disponibleOperativoLine = computeDisponibleCuenta(cupo, uso, extras, adj)
    return {
      ...c,
      balance,
      limit,
      usagePct,
      cupo,
      uso,
      disponibleOperativoLine,
      fuenteDatos: "seed" as const,
      diferenciaReconciliacion: 0,
      fechaUltimaReconciliacion: today,
      conciliacionPendiente: false,
    }
  })

  if (touched) markCreditReconciliationSeedApplied()

  return next
}
