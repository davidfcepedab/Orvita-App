import type { NextRequest } from "next/server"
import { authorizeAutomationRequest } from "../../../../../lib/auth/automationGuard"
import { createSupabaseServerClient } from "../../../../../lib/supabase/server"
import {
  isAppProfileId,
  resolveProfileLabel,
  type AppProfileId,
} from "../../../../../lib/config/profiles"
import {
  loadDailyCheckinSummariesFromSheets,
  loadDailyCheckinSummariesFromSheetsWithStats,
} from "../../../../../lib/checkins/checkinSummarySync"

function parseIntParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

async function run(req: NextRequest) {
  const authError = authorizeAutomationRequest(req)
  if (authError) return authError

  const profileIdParam = req.nextUrl.searchParams.get("profileId")
  const daysBack = Math.max(1, Math.min(3650, parseIntParam(req.nextUrl.searchParams.get("daysBack"), 120)))
  const debug = req.nextUrl.searchParams.get("debug") === "1"
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
  const sampleLimit = debug ? Math.max(0, Math.min(10, parseIntParam(req.nextUrl.searchParams.get("sampleLimit"), 5))) : 0

  try {
    const supabase = createSupabaseServerClient()

    const profilesToSync: AppProfileId[] = isAppProfileId(profileIdParam)
      ? [profileIdParam]
      : ["david", "esposo"]

    const results: Array<{
      profileId: AppProfileId
      scanned: number
      upserted: number
      error?: string
      debug?: unknown
    }> = []

    for (const profileId of profilesToSync) {
      try {
        const { summaries, stats, samples, cutoffDay } = debug
          ? await loadDailyCheckinSummariesFromSheetsWithStats({ profileId, daysBack, sampleLimit })
          : { summaries: await loadDailyCheckinSummariesFromSheets({ profileId, daysBack }), stats: null, samples: null, cutoffDay: null }

        if (!dryRun) {
          const profileUpsert = await supabase
            .from("orbita_profiles")
            .upsert({
              id: profileId,
              user_id: profileId, // user_id simplificado en esta rama (RLS se endurece luego con JWT)
              label: resolveProfileLabel(profileId),
            }, { onConflict: "id" })
          if (profileUpsert.error) throw profileUpsert.error
        }

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
        if (!dryRun) {
          for (let i = 0; i < payload.length; i += 500) {
            const batch = payload.slice(i, i + 500)
            const res = await supabase
              .from("orbita_daily_checkins_summary")
              .upsert(batch, { onConflict: "profile_id,day" })
            if (res.error) throw res.error
            upserted += batch.length
          }
        } else {
          upserted = payload.length
        }

        results.push({
          profileId,
          scanned: summaries.length,
          upserted,
          ...(debug ? { debug: { cutoffDay, stats, samples } } : {}),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown_error"
        results.push({ profileId, scanned: 0, upserted: 0, error: message })
      }
    }

    const anyOk = results.some((r) => !r.error)
    const status = anyOk ? 200 : 500
    return Response.json({
      success: anyOk,
      daysBack,
      dryRun,
      results,
    }, { status })
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
