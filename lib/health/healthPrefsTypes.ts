export type HealthSupplement = {
  id: string
  name: string
  amount: string
  active: boolean
}

export type HealthPreferencesPayload = {
  supplements?: HealthSupplement[]
}
