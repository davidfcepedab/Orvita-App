export type BillingFrequency = "weekly" | "monthly" | "semiannual" | "annual"

export const BILLING_FREQUENCY_OPTIONS: { value: BillingFrequency; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
]

export function normalizeBillingFrequency(v: unknown): BillingFrequency {
  if (v === "weekly" || v === "monthly" || v === "semiannual" || v === "annual") return v
  return "monthly"
}

/** Convierte el monto del periodo a equivalente mensual (para simulator / burn). */
export function chargeToMonthly(amount: number, f: BillingFrequency): number {
  const a = Math.max(0, Number(amount))
  if (!Number.isFinite(a)) return 0
  switch (f) {
    case "weekly":
      return Math.round((a * 52) / 12)
    case "monthly":
      return Math.round(a)
    case "semiannual":
      return Math.round(a / 6)
    case "annual":
      return Math.round(a / 12)
    default:
      return Math.round(a)
  }
}

/** Muestra en formulario: monto por periodo a partir del mensual guardado. */
export function monthlyToChargeInput(monthly: number, f: BillingFrequency): number {
  const m = Math.max(0, Number(monthly))
  if (!Number.isFinite(m)) return 0
  switch (f) {
    case "weekly":
      return Math.round((m * 12) / 52)
    case "monthly":
      return Math.round(m)
    case "semiannual":
      return Math.round(m * 6)
    case "annual":
      return Math.round(m * 12)
    default:
      return Math.round(m)
  }
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Próxima fecha ISO (YYYY-MM-DD) con `renewalDay` en el mes civil, en o después de `from`. */
export function nextRenewalIsoFromDay(renewalDay: number, from: Date = new Date()): string {
  const day = Math.min(28, Math.max(1, Math.round(renewalDay)))
  let y = from.getFullYear()
  let m0 = from.getMonth()
  const tryDate = (year: number, month: number) => {
    const last = new Date(year, month + 1, 0).getDate()
    const d = Math.min(day, last)
    return new Date(year, month, d)
  }
  let cand = tryDate(y, m0)
  if (cand < startOfLocalDay(from)) {
    m0 += 1
    if (m0 > 11) {
      m0 = 0
      y += 1
    }
    cand = tryDate(y, m0)
  }
  return `${cand.getFullYear()}-${String(cand.getMonth() + 1).padStart(2, "0")}-${String(cand.getDate()).padStart(2, "0")}`
}

export function daysUntilRenewalFromDay(renewalDay: number, from: Date = new Date()): number {
  const next = nextRenewalIsoFromDay(renewalDay, from)
  const t0 = startOfLocalDay(from).getTime()
  const t1 = startOfLocalDay(new Date(next + "T12:00:00")).getTime()
  return Math.max(0, Math.round((t1 - t0) / 86_400_000))
}
