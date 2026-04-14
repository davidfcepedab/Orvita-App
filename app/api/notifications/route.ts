import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 30))
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0)

  const { data: notifications, error: listErr } = await auth.supabase
    .from("orbita_notifications")
    .select("id, title, body, category, link, read_at, created_at, metadata")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (listErr) {
    return NextResponse.json({ success: false, error: listErr.message }, { status: 500 })
  }

  const { count: unreadCount, error: countErr } = await auth.supabase
    .from("orbita_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)

  if (countErr) {
    return NextResponse.json({ success: false, error: countErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const body = (await req.json().catch(() => null)) as {
    markAllRead?: boolean
    ids?: string[]
  } | null

  if (!body) {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const now = new Date().toISOString()

  if (body.markAllRead) {
    const { error } = await auth.supabase
      .from("orbita_notifications")
      .update({ read_at: now })
      .eq("user_id", auth.userId)
      .is("read_at", null)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { error } = await auth.supabase
      .from("orbita_notifications")
      .update({ read_at: now })
      .in("id", body.ids)
      .eq("user_id", auth.userId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: "Provide markAllRead or ids" }, { status: 400 })
}
