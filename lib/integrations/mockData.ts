type HealthMetricDraft = {
  sleep_hours: number
  hrv_ms: number
  readiness_score: number
  steps: number
  calories: number
}

type BankAccountDraft = {
  provider: "bancolombia" | "davivienda" | "nequi"
  account_name: string
  account_mask: string
  balance_available: number
  balance_current: number
}

type TransactionDraft = {
  description: string
  amount: number
  direction: "credit" | "debit"
  category: string
  posted_at: string
}

function jitter(base: number, spread: number) {
  return Math.round((base + (Math.random() * 2 - 1) * spread) * 100) / 100
}

export function buildMockHealthMetric(): HealthMetricDraft {
  const sleep = Math.max(4.6, jitter(7.2, 1.6))
  const hrv = Math.max(18, Math.round(jitter(56, 15)))
  const readiness = Math.max(35, Math.min(98, Math.round(jitter(76, 18))))
  const steps = Math.max(1200, Math.round(jitter(8200, 3400)))
  const calories = Math.max(1200, Math.round(jitter(2380, 480)))
  return {
    sleep_hours: sleep,
    hrv_ms: hrv,
    readiness_score: readiness,
    steps,
    calories,
  }
}

export function buildMockBankAccount(provider: BankAccountDraft["provider"]): BankAccountDraft {
  const accountName =
    provider === "nequi" ? "Nequi principal" : provider === "bancolombia" ? "Ahorros Bancolombia" : "Cuenta Davivienda"
  const mask = `${Math.floor(1000 + Math.random() * 9000)}`
  const available = Math.max(0, Math.round(jitter(4_200_000, 2_700_000)))
  const current = available + Math.round(jitter(180_000, 320_000))
  return {
    provider,
    account_name: accountName,
    account_mask: `****${mask}`,
    balance_available: available,
    balance_current: current,
  }
}

export function buildMockTransactions(): TransactionDraft[] {
  const now = Date.now()
  const rows = [
    { description: "Cobro cliente recurrente", amount: Math.round(jitter(1_850_000, 450_000)), direction: "credit", category: "ingresos" },
    { description: "Arriendo oficina", amount: Math.round(jitter(1_200_000, 250_000)), direction: "debit", category: "fijos" },
    { description: "Herramientas SaaS", amount: Math.round(jitter(210_000, 90_000)), direction: "debit", category: "software" },
    { description: "Transferencia ahorro", amount: Math.round(jitter(390_000, 130_000)), direction: "debit", category: "ahorro" },
    { description: "Ingreso extraordinario", amount: Math.round(jitter(760_000, 310_000)), direction: "credit", category: "ingresos" },
  ] as const

  return rows.map((row, idx) => ({
    ...row,
    posted_at: new Date(now - idx * 86_400_000).toISOString(),
  }))
}
