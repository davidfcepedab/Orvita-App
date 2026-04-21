import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { sendWebPushToUser } from "@/lib/notifications/sendWebPushToUser"

export const runtime = "nodejs"

/**
 * Crea una notificación de prueba para el usuario autenticado y dispara Web Push si hay suscripciones.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const parsed = (await req.json().catch(() => ({}))) as { title?: string; body?: string }
  const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Notificación de prueba"
  const body =
    typeof parsed.body === "string" && parsed.body.trim()
      ? parsed.body.trim()
      : "Bandeja in-app lista. Si activaste push en este dispositivo, también deberías ver una alerta del sistema."

  const { data, error } = await auth.supabase
    .from("orbita_notifications")
    .insert({
      user_id: auth.userId,
      title,
      body,
      category: "system",
      link: "/",
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    return NextResponse.json({ success: false, error: error?.message ?? "No se pudo crear" }, { status: 500 })
  }

  const push = await sendWebPushToUser(auth.supabase, auth.userId, {
    title,
    body,
    url: "/hoy",
    notificationId: data.id,
    category: "palanca",
    actions: [
      { action: "capital", title: "Ir a Capital" },
      { action: "ai", title: "Resolver con IA" },
    ],
  })

  return NextResponse.json({
    success: true,
    id: data.id,
    push: { sent: push.sent, errors: push.errors },
  })
}
