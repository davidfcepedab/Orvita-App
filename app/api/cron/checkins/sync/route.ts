import type { NextRequest } from "next/server"
import { authorizeAutomationRequest } from "../../../../../lib/auth/automationGuard"
import { createSupabaseServerClient } from "../../../../../lib/supabase/server"
import {
  isAppProfileId,
  resolveDefaultProfileId,
  resolveProfileLabel,
  type AppProfileId,
} from "../../../../../lib/config/profiles"
import { loadDailyCheckinSummariesFromSheets } from "../../../../../lib/checkins/checkinSummarySync"

function parseIntParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

async function run(req: NextRequest) {
  const authError = authorizeAutomationRequest(req)
  if (authError) return authError

  const profileIdParam = req.nextUrl.searchParams.get("profileId")
  const profileId = (isAppProfileId(profileIdParam)
    ? profileIdParam
    : resolveDefaultProfileId()) as AppProfileId
  const daysBack = Math.max(1, Math.min(3650, parseIntParam(req.nextUrl.searchParams.get("daysBack"), 120)))

  try {
    const summaries = await loadDailyCheckinSummariesFromSheets({ profileId, daysBack })
    const supabase = createSupabaseServerClient()

    // Base mínima de perfiles (2 perfiles)
    const profileUpsert = await supabase
      .from("orbita_profiles")
      .upsert({
        id: profileId,
        user_id: profileId, // user_id simplificado en esta rama (RLS se endurece luego con JWT)
        label: resolveProfileLabel(profileId),
      }, { onConflict: "id" })
    if (profileUpsert.error) throw profileUpsert.error

    const payload = summaries.map((item) => ({
      user_id: profileId,
      profile_id: profileId,
      day: item.day,
      energy: item.energy,
      focus: item.focus,
      mood: item.mood,
      notes: item.notes,
    }))

    let upserted = 0
    for (let i = 0; i < payload.length; i += 500) {
      const batch = payload.slice(i, i + 500)
      const res = await supabase
        .from("orbita_daily_checkins_summary")
        .upsert(batch, { onConflict: "profile_id,day" })
      if (res.error) throw res.error
      upserted += batch.length
    }

    return Response.json({
      success: true,
      profileId,
      daysBack,
      scanned: summaries.length,
      upserted,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown_error"
    console.error("CHECKINS SYNC ERROR:", message)
    return Response.json(
      { success: false, error: "Error sincronizando checkins", detail: message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return run(req)
}

export async function POST(req: NextRequest) {
  return run(req)
}

