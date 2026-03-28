import type { UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"

const LS_KEY = "orbita:user_subscriptions:v1"

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultSeedSubscriptions(): UserSubscription[] {
  const y = new Date().getFullYear()
  const m = String(new Date().getMonth() + 1).padStart(2, "0")
  const base = `${y}-${m}-`
  return [
    {
      id: newId(),
      name: "Figma",
      category: "Software",
      amount_monthly: 60_000,
      renewal_date: `${base}12`,
      include_in_simulator: true,
      active: true,
      status: "active",
    },
    {
      id: newId(),
      name: "ChatGPT Plus",
      category: "Software",
      amount_monthly: 80_000,
      renewal_date: `${base}05`,
      include_in_simulator: true,
      active: true,
      status: "active",
    },
    {
      id: newId(),
      name: "GitHub Copilot",
      category: "Software",
      amount_monthly: 45_000,
      renewal_date: `${base}18`,
      include_in_simulator: true,
      active: true,
      status: "active",
    },
    {
      id: newId(),
      name: "Equinox Gym",
      category: "Fitness",
      amount_monthly: 350_000,
      renewal_date: `${base}01`,
      include_in_simulator: true,
      active: true,
      status: "active",
    },
    {
      id: newId(),
      name: "Spotify",
      category: "Entretenimiento",
      amount_monthly: 45_000,
      renewal_date: `${base}22`,
      include_in_simulator: true,
      active: true,
      status: "active",
    },
  ]
}

export function readSubscriptionsFromLocalStorage(): UserSubscription[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as UserSubscription[]
  } catch {
    return []
  }
}

export function writeSubscriptionsToLocalStorage(rows: UserSubscription[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_KEY, JSON.stringify(rows))
}

export function ensureLocalSubscriptionsSeeded(): UserSubscription[] {
  let rows = readSubscriptionsFromLocalStorage()
  if (rows.length === 0) {
    rows = defaultSeedSubscriptions()
    writeSubscriptionsToLocalStorage(rows)
  }
  return rows
}

export function upsertLocalSubscription(row: UserSubscription, all: UserSubscription[]) {
  const idx = all.findIndex((r) => r.id === row.id)
  const next = idx >= 0 ? [...all.slice(0, idx), row, ...all.slice(idx + 1)] : [...all, row]
  writeSubscriptionsToLocalStorage(next)
  return next
}

export function deleteLocalSubscription(id: string, all: UserSubscription[]) {
  const next = all.filter((r) => r.id !== id)
  writeSubscriptionsToLocalStorage(next)
  return next
}

export { LS_KEY as USER_SUBSCRIPTIONS_LS_KEY }
