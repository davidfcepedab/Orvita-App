/** VAPID para Web Push (RFC 8292). Claves en .env — ver docs/NOTIFICATIONS.md */

export function getVapidPublicKey(): string | null {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  return k || null
}

export function getVapidPrivateKey(): string | null {
  const k = process.env.VAPID_PRIVATE_KEY?.trim()
  return k || null
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:hello@orvita.app"
}

export function isVapidConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey())
}
