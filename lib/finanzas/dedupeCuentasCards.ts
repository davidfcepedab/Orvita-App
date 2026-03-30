import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"
import { normalizeFinanceAccountLabel } from "@/lib/finanzas/ledgerAccountTxRollup"

function savingsKey(s: CuentasSavingsCard) {
  return normalizeFinanceAccountLabel(s.label)
}

function pickBestSavingsGroup(group: CuentasSavingsCard[]): CuentasSavingsCard {
  if (group.length === 1) return group[0]!
  return [...group].sort((a, b) => {
    const da = Math.abs(Number(a.amount))
    const db = Math.abs(Number(b.amount))
    if (Math.abs(db - da) > 1) return db - da
    const la = a.id.startsWith("ledger-")
    const lb = b.id.startsWith("ledger-")
    if (la && !lb) return -1
    if (!la && lb) return 1
    return 0
  })[0]!
}

export function dedupeSavingsCards(items: CuentasSavingsCard[]): CuentasSavingsCard[] {
  const m = new Map<string, CuentasSavingsCard[]>()
  for (const s of items) {
    const k = savingsKey(s)
    const arr = m.get(k) ?? []
    arr.push(s)
    m.set(k, arr)
  }
  return [...m.values()].map(pickBestSavingsGroup)
}

function creditKey(c: CuentasCreditCard) {
  const last = c.last4.replace(/\D/g, "").slice(-4).padStart(4, "0")
  return `${c.bankLabel.trim().toLowerCase()}|${last}`
}

function pickBestCreditGroup(group: CuentasCreditCard[]): CuentasCreditCard {
  if (group.length === 1) return group[0]!
  return [...group].sort((a, b) => {
    if (b.balance !== a.balance) return b.balance - a.balance
    const la = a.id.startsWith("ledger-")
    const lb = b.id.startsWith("ledger-")
    if (la && !lb) return -1
    if (!la && lb) return 1
    if (b.limit !== a.limit) return b.limit - a.limit
    return 0
  })[0]!
}

export function dedupeCreditCards(items: CuentasCreditCard[]): CuentasCreditCard[] {
  const m = new Map<string, CuentasCreditCard[]>()
  for (const c of items) {
    const k = creditKey(c)
    const arr = m.get(k) ?? []
    arr.push(c)
    m.set(k, arr)
  }
  return [...m.values()].map(pickBestCreditGroup)
}

function loanKey(l: CuentasLoanCard) {
  return l.title
    .trim()
    .toLowerCase()
    .replace(/\s*·\s*/g, " ")
    .replace(/\s+/g, " ")
}

function pickBestLoanGroup(group: CuentasLoanCard[]): CuentasLoanCard {
  if (group.length === 1) return group[0]!
  return [...group].sort((a, b) => {
    if (b.saldoPendiente !== a.saldoPendiente) return b.saldoPendiente - a.saldoPendiente
    const la = a.id.startsWith("ledger-")
    const lb = b.id.startsWith("ledger-")
    if (la && !lb) return -1
    if (!la && lb) return 1
    return 0
  })[0]!
}

export function dedupeLoanCards(items: CuentasLoanCard[]): CuentasLoanCard[] {
  const m = new Map<string, CuentasLoanCard[]>()
  for (const l of items) {
    const k = loanKey(l)
    const arr = m.get(k) ?? []
    arr.push(l)
    m.set(k, arr)
  }
  return [...m.values()].map(pickBestLoanGroup)
}
