/** Cliente: registro de Web Push + utilidad VAPID (Push API). */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export async function registerOrvitaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch {
    return null
  }
}

export async function subscribeOrvitaPush(
  vapidPublicKey: string,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: "Este navegador no admite notificaciones push." }
  }

  await registerOrvitaServiceWorker()
  const readyReg = await navigator.serviceWorker.ready
  if (!readyReg) return { ok: false, error: "No se pudo registrar el service worker." }

  const perm = await Notification.requestPermission()
  if (perm !== "granted") {
    return { ok: false, error: "Permiso de notificaciones denegado." }
  }

  let sub: PushSubscription
  try {
    sub = await readyReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al suscribir push" }
  }

  const res = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sub.toJSON()),
  })

  const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
  if (!res.ok || !json.success) {
    return { ok: false, error: json.error ?? res.statusText }
  }

  return { ok: true }
}

export async function unsubscribeOrvitaPush(
  accessToken: string,
  subscription: PushSubscription,
): Promise<boolean> {
  const j = subscription.toJSON()
  if (!j.endpoint) return false
  const res = await fetch("/api/notifications/push/unsubscribe", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: j.endpoint }),
  })
  return res.ok
}
