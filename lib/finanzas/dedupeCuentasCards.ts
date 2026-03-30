import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"

function savingsKey(s: CuentasSavingsCard) {
  return s.label.trim().toLowerCase().replace(/\s+/g, " ")
}

function savingsScore(s: CuentasSavingsCard) {
  return (
    (s.id.startsWith("ledger-") ? 8 : 0) +
    (s.manualRowId ? 2 : 0) +
    (Math.abs(Number(s.amount)) > 1 ? 4 : 0)
  )
}

export function dedupeSavingsCards(items: CuentasSavingsCard[]): CuentasSavingsCard[] {
  const m = new Map<string, CuentasSavingsCard>()
  for (const s of items) {
    const k = savingsKey(s)
    const prev = m.get(k)
    if (!prev || savingsScore(s) > savingsScore(prev)) m.set(k, s)
  }
  return [...m.values()]
}

function creditKey(c: CuentasCreditCard) {
  const last = c.last4.replace(/\D/g, "").slice(-4).padStart(4, "0")
  return `${c.bankLabel.trim().toLowerCase()}|${last}`
}

function creditScore(c: CuentasCreditCard) {
  return (
    (c.id.startsWith("ledger-") ? 16 : 0) +
    (c.manualRowId ? 2 : 0) +
    (c.limit > 0 ? 8 : 0) +
    (c.balance > 0 ? 4 : 0)
  )
}

export function dedupeCreditCards(items: CuentasCreditCard[]): CuentasCreditCard[] {
  const m = new Map<string, CuentasCreditCard>()
  for (const c of items) {
    const k = creditKey(c)
    const prev = m.get(k)
    if (!prev || creditScore(c) > creditScore(prev)) m.set(k, c)
  }
  return [...m.values()]
}

function loanKey(l: CuentasLoanCard) {
  return l.title.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*·\s*/g, " ")
}

function loanScore(l: CuentasLoanCard) {
  return (
    (l.id.startsWith("ledger-") ? 16 : 0) +
    (l.manualRowId ? 2 : 0) +
    (l.saldoPendiente > 0 ? 8 : 0) +
    (l.montoOriginal > 0 ? 4 : 0)
  )
}

export function dedupeLoanCards(items: CuentasLoanCard[]): CuentasLoanCard[] {
  const m = new Map<string, CuentasLoanCard>()
  for (const l of items) {
    const k = loanKey(l)
    const prev = m.get(k)
    if (!prev || loanScore(l) > loanScore(prev)) m.set(k, l)
  }
  return [...m.values()]
}
