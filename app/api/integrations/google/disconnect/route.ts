import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const { error } = await auth.supabase.from("user_integrations").delete().eq("provider", "google")

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
