import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { ensureHevyUserLinkedPreference } from "@/lib/health/hevyUserLinkPreference"
import { buildMockTrainingDays } from "@/lib/training/mockTrainingDays"
import { fetchHevyWorkoutById, fetchHevyWorkouts, isHevyEnvConfigured } from "@/src/lib/integrations/hevy"
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
    return NextResponse.json({
      success: true,
      trainingDays: buildMockTrainingDays(),
      lastSyncAt: new Date().toISOString(),
      sourceLabel: "Hevy (mock)",
      fetchedWorkouts: 0,
    })
  }

  if (!isHevyEnvConfigured()) {
    return NextResponse.json(
      {
        success: false,
        code: "not_configured" as const,
        error: "Hevy no está conectado en el servidor. Quien administre la app debe configurar HEVY_BASE_URL y HEVY_API_KEY.",
      },
      { status: 503 },
    )
  }

  try {
    const payload = (await fetchHevyWorkouts()) as HevyResponse
    const workouts = extractWorkouts(payload)
    const enrichedWorkouts = await enrichLatestWorkouts(workouts, 3)
    const trainingDays = workouts.map((workout) => normalizeHevyWorkout(workout))
    const normalizedDetailed = enrichedWorkouts.map((workout) => normalizeHevyWorkout(extractWorkoutEntity(workout)))
    const mergedTrainingDays = mergePreferDetailed(trainingDays, normalizedDetailed)

    try {
      await ensureHevyUserLinkedPreference(auth.supabase, auth.userId)
    } catch {
      /* preferir entregar entrenos aunque falle el marcado de enlace */
    }

    return NextResponse.json({
      success: true,
      trainingDays: mergedTrainingDays,
      lastSyncAt: new Date().toISOString(),
      sourceLabel: "Hevy",
      fetchedWorkouts: workouts.length,
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("HEVY WORKOUTS ERROR:", detail)
    const isAuth = /401|403|unauthoriz|forbidden|invalid.*key|api.*key/i.test(detail)
    const isPathOrEnvMismatch = /404|not found|\/v1\/workouts/i.test(detail)
    return NextResponse.json(
      {
        success: false,
        code: "hevy_fetch_failed" as const,
        error: isAuth
          ? "Hevy no aceptó la clave. Revisa HEVY_API_KEY (Hevy Pro) y vuelve a guardar variables en Vercel."
          : isPathOrEnvMismatch
            ? "No pudimos leer workouts de Hevy. Verifica HEVY_BASE_URL (recomendado: https://api.hevyapp.com)."
          : "No pudimos obtener tus entrenos de Hevy. Revisa tu conexión a internet o vuelve a intentar en un rato.",
      },
      { status: 500 },
    )
  }
}

async function enrichLatestWorkouts(workouts: unknown[], maxDetails: number): Promise<unknown[]> {
  const candidates = workouts.slice(0, maxDetails)
  const detailed = await Promise.all(
    candidates.map(async (workout) => {
      const id = readWorkoutId(workout)
      if (!id) return workout
      try {
        return await fetchHevyWorkoutById(id)
      } catch {
        return workout
      }
    }),
  )
  return detailed
}

function extractWorkoutEntity(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload
  const maybeWorkout = (payload as { workout?: unknown }).workout
  if (maybeWorkout && typeof maybeWorkout === "object") return maybeWorkout
  return payload
}

function readWorkoutId(workout: unknown): string | null {
  if (!workout || typeof workout !== "object") return null
  const id = (workout as { id?: unknown }).id
  return typeof id === "string" && id.trim() ? id : null
}

function mergePreferDetailed(base: ReturnType<typeof normalizeHevyWorkout>[], detailed: ReturnType<typeof normalizeHevyWorkout>[]) {
  const byDateName = new Map<string, ReturnType<typeof normalizeHevyWorkout>>()
  for (const item of base) {
    byDateName.set(`${item.date}::${item.workoutName ?? ""}`, item)
  }
  for (const item of detailed) {
    const key = `${item.date}::${item.workoutName ?? ""}`
    const current = byDateName.get(key)
    if (!current) {
      byDateName.set(key, item)
      continue
    }
    const currentSets = current.totalSets ?? 0
    const nextSets = item.totalSets ?? 0
    if (nextSets >= currentSets) {
      byDateName.set(key, item)
    }
  }
  return [...byDateName.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}
