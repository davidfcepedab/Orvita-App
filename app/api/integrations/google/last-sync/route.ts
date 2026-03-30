import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { supabase, userId } = auth

    const [{ data: calRows }, { data: taskRows }] = await Promise.all([
      supabase
        .from("external_calendar_events")
        .select("synced_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("synced_at", { ascending: false })
        .limit(1),
      supabase
        .from("external_tasks")
        .select("synced_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("synced_at", { ascending: false })
        .limit(1),
    ])

    const calT = calRows?.[0]?.synced_at ? new Date(String(calRows[0].synced_at)).getTime() : 0
    const taskT = taskRows?.[0]?.synced_at ? new Date(String(taskRows[0].synced_at)).getTime() : 0
    const best = Math.max(calT, taskT)

    return NextResponse.json({
      success: true,
      lastSyncAt: best > 0 ? new Date(best).toISOString() : null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error leyendo última sincronización"
    return NextResponse.json({ success: false, error: message, lastSyncAt: null }, { status: 500 })
  }
}
