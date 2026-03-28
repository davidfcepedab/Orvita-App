export type SubscriptionStatus = "active" | "paused" | "cancelled"

export type UserSubscription = {
  id: string
  name: string
  category: string
  amount_monthly: number
  renewal_date: string
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
