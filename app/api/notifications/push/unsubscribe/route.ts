import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export const runtime = "nodejs"

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const raw = (await req.json().catch(() => null)) as { endpoint?: string } | null
  const endpoint = typeof raw?.endpoint === "string" ? raw.endpoint.trim() : ""
  if (!endpoint) {
    return NextResponse.json({ success: false, error: "endpoint requerido" }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from("orbita_push_subscriptions")
    .delete()
    .eq("user_id", auth.userId)
    .eq("endpoint", endpoint)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
