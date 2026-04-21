import type { OrvitaPushCategory, WebPushPayload } from "@/lib/notifications/sendWebPushToUser"

/** Misma unión que en `createNotification.ts` (evita import circular). */
type NotificationCategory = "system" | "finance" | "habits" | "agenda" | "decision" | "checkin" | "training"

/** Mapea categoría de producto → canal push + acciones en la notificación del sistema. */
export function enrichWebPushFromNotificationCategory(
  category: NotificationCategory | undefined,
  base: WebPushPayload,
): WebPushPayload {
  const c = category ?? "system"
  const url = base.url ?? "/"

  const out: WebPushPayload = { ...base, category: "system" }

  if (c === "checkin" || c === "decision") {
    out.category = "palanca"
    out.actions = [
      { action: "hoy", title: "Activar Palanca #1" },
      { action: "capital", title: "Ir a Capital" },
    ]
    out.title = `Palanca #1 · ${base.title}`
    return out
  }
  if (c === "finance") {
    out.category = "presion_critica"
    out.actions = [
      { action: "capital", title: "Ir a Capital" },
      { action: "block90", title: "Bloquear 90 min" },
    ]
    return out
  }
  if (c === "habits") {
    out.category = "habitos"
    out.actions = [
      { action: "habitos", title: "Ver hábitos" },
      { action: "hoy", title: "Ir a Hoy" },
    ]
    return out
  }
  if (c === "agenda" || c === "training") {
    out.category = "energia"
    out.actions = [
      { action: "agenda", title: "Abrir agenda" },
      { action: "hoy", title: "Ir a Hoy" },
    ]
    return out
  }

  out.category = "system"
  out.actions = [{ action: "hoy", title: "Abrir Órvita" }]
  out.url = url
  return out
}
