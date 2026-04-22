import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { buildMockTrainingDays } from "@/lib/training/mockTrainingDays"
import { fetchHevyWorkouts, isHevyEnvConfigured } from "@/src/lib/integrations/hevy"
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
    const trainingDays = workouts.map((workout) => normalizeHevyWorkout(workout))

    return NextResponse.json({ success: true, trainingDays })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    console.error("HEVY WORKOUTS ERROR:", detail)
    const isAuth =
      /401|403|unauthoriz|forbidden|invalid.*key|api.*key/i.test(detail) || detail.includes("Hevy error:")
    return NextResponse.json(
      {
        success: false,
        code: "hevy_fetch_failed" as const,
        error: isAuth
          ? "Hevy no aceptó la clave. Revisa HEVY_API_KEY en el servidor o la URL de la API (Hevy/legacy)."
          : "No pudimos obtener tus entrenos de Hevy. Revisa tu conexión a internet o vuelve a intentar en un rato.",
      },
      { status: 500 },
    )
  }
}
