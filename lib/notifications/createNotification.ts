import { createServiceClient } from "@/lib/supabase/server"
import { sendWebPushToUser } from "@/lib/notifications/sendWebPushToUser"

export type NotificationCategory = "system" | "finance" | "habits" | "agenda" | "decision" | "checkin" | "training"

/**
 * Inserta notificación y dispara Web Push (si hay suscripciones y VAPID).
 * Requiere `SUPABASE_SERVICE_ROLE_KEY` en el servidor (cron, jobs, otras APIs sin JWT de usuario).
 */
export async function createNotificationForUser(params: {
  userId: string
  title: string
  body: string
  category?: NotificationCategory
  link?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ id: string | null; error?: string }> {
  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : "Service client unavailable" }
  }

  const { data, error } = await supabase
    .from("orbita_notifications")
    .insert({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      category: params.category ?? "system",
      link: params.link ?? null,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    return { id: null, error: error?.message ?? "insert failed" }
  }

  void sendWebPushToUser(supabase, params.userId, {
    title: params.title,
    body: params.body,
    url: params.link ?? "/",
    notificationId: data.id,
  })

  return { id: data.id }
}
