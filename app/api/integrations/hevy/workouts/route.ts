import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { buildMockTrainingDays } from "@/lib/training/mockTrainingDays"
import { fetchHevyWorkouts } from "@/src/lib/integrations/hevy"
import { normalizeHevyWorkout } from "@/src/modules/training/hevyNormalizer"

export const runtime = "nodejs"

type HevyResponse = {
  workouts?: unknown[]
  data?: unknown[]
  items?: unknown[]
}

function extractWorkouts(payload: HevyResponse): unknown[] {
  if (Array.isArray(payload.workouts)) return payload.workouts
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.items)) return payload.items
  return []
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  if (isAppMockMode()) {
    return NextResponse.json({ success: true, trainingDays: buildMockTrainingDays() })
  }

  try {
    const payload = (await fetchHevyWorkouts()) as HevyResponse
    const workouts = extractWorkouts(payload)
    const trainingDays = workouts.map((workout) => normalizeHevyWorkout(workout))

    return NextResponse.json({ success: true, trainingDays })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("HEVY WORKOUTS ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo cargar Hevy" },
      { status: 500 }
    )
  }
}
