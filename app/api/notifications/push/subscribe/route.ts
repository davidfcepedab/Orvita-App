import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isVapidConfigured } from "@/lib/notifications/vapid"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type Body = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

export async function POST(req: NextRequest) {
  if (!isVapidConfigured()) {
    return NextResponse.json(
      { success: false, error: "Web Push no configurado en el servidor (VAPID)." },
      { status: 503 },
    )
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const raw = (await req.json().catch(() => null)) as Body | null
  const endpoint = typeof raw?.endpoint === "string" ? raw.endpoint.trim() : ""
  const p256dh = typeof raw?.keys?.p256dh === "string" ? raw.keys.p256dh.trim() : ""
  const authKey = typeof raw?.keys?.auth === "string" ? raw.keys.auth.trim() : ""

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ success: false, error: "Suscripción push incompleta" }, { status: 400 })
  }

  let svc: ReturnType<typeof createServiceClient>
  try {
    svc = createServiceClient()
  } catch {
    return NextResponse.json(
      { success: false, error: "Servidor sin SUPABASE_SERVICE_ROLE_KEY; no se puede registrar push." },
      { status: 503 },
    )
  }

  const now = new Date().toISOString()
  const { error } = await svc.from("orbita_push_subscriptions").upsert(
    {
      user_id: auth.userId,
      endpoint,
      p256dh,
      auth: authKey,
      updated_at: now,
    },
    { onConflict: "endpoint" },
  )

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
