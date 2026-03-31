import type { BillingFrequency } from "@/lib/finanzas/subscriptionBilling"

export type SubscriptionStatus = "active" | "paused" | "cancelled"

export type UserSubscription = {
  id: string
  name: string
  category: string
  /** Equivalente mensual (simulador / total recurrente). */
  amount_monthly: number
  renewal_date: string
  billing_frequency: BillingFrequency
  /** Día del mes (1–28) para próxima renovación. */
  renewal_day: number
  include_in_simulator: boolean
  active: boolean
  status: SubscriptionStatus
  created_at?: string
  updated_at?: string
}

export const SUBSCRIPTION_CATEGORIES = [
  "Software",
  "Fitness",
  "Entretenimiento",
  "Productividad",
  "Noticias",
  "Otros",
] as const

export type SubscriptionCategory = (typeof SUBSCRIPTION_CATEGORIES)[number]

export function subscriptionActiveBurn(s: UserSubscription) {
  return s.status === "active"
}

export function subscriptionPotentialSaving(s: UserSubscription) {
  return s.status === "paused" || s.status === "cancelled" ? s.amount_monthly : 0
}
