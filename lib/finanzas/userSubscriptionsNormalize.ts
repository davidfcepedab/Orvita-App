import { dayFromIso } from "@/lib/finanzas/commitmentAnchorDate"
import { normalizeBillingFrequency } from "@/lib/finanzas/subscriptionBilling"
import type { SubscriptionStatus, UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"

/** Completa `billing_frequency` y `renewal_day` en filas antiguas. */
export function normalizeUserSubscription(r: UserSubscription): UserSubscription {
  const renewal_date =
    typeof r.renewal_date === "string" ? r.renewal_date.slice(0, 10) : String(r.renewal_date ?? "").slice(0, 10)
  let renewal_day =
    typeof r.renewal_day === "number" && Number.isFinite(r.renewal_day) && r.renewal_day >= 1
      ? Math.round(r.renewal_day)
      : dayFromIso(renewal_date || "2000-01-01")
  renewal_day = Math.min(28, Math.max(1, renewal_day))
  return {
    ...r,
    renewal_date: /^\d{4}-\d{2}-\d{2}$/.test(renewal_date) ? renewal_date : r.renewal_date,
    billing_frequency: normalizeBillingFrequency(r.billing_frequency),
    renewal_day,
  }
}

export function stubUserSubscription(partial: {
  id: string
  name: string
  category: string
  amount_monthly: number
  renewal_date: string
  include_in_simulator?: boolean
  status?: SubscriptionStatus
}): UserSubscription {
  const rd = dayFromIso(partial.renewal_date)
  return normalizeUserSubscription({
    id: partial.id,
    name: partial.name,
    category: partial.category,
    amount_monthly: partial.amount_monthly,
    renewal_date: partial.renewal_date.slice(0, 10),
    billing_frequency: "monthly",
    renewal_day: Math.min(28, Math.max(1, rd)),
    include_in_simulator: partial.include_in_simulator ?? true,
    active: (partial.status ?? "active") === "active",
    status: partial.status ?? "active",
  })
}
