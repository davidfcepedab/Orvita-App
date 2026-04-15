import { NextRequest, NextResponse } from "next/server"
import { authorizeAutomationRequest } from "@/lib/auth/automationGuard"
import { createServiceClient } from "@/lib/supabase/server"
import { runNotificationCron, type CronJobName } from "@/lib/notifications/cron/runAllJobs"

export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const denied = authorizeAutomationRequest(req)
  if (denied) return denied

  const raw = req.nextUrl.searchParams.get("jobs") ?? "all"
  const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  const jobs = (parts.length ? parts : ["all"]) as CronJobName[]

  try {
    const supabase = createServiceClient()
    const summary = await runNotificationCron(supabase, jobs)
    return NextResponse.json({ success: true, summary })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("CRON notifications dispatch:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
