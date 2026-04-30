import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { hevyLinkedAtFromPreferences } from "@/lib/health/hevyUserLinkPreference"
import type { HealthPreferencesPayload } from "@/lib/health/healthPrefsTypes"
import { isHevyEnvConfigured } from "@/src/lib/integrations/hevy"

export const runtime = "nodejs"

/**
 * Estado Hevy para UI: servidor configurado vs usuario que ya enlazó (preferencia persistida).
 * No llama a la API externa Hevy (evita doble fetch con /workouts).
 */
export async function GET(_req: NextRequest) {
  if (isAppMockMode()) {
    const now = new Date().toISOString()
    return NextResponse.json({
      success: true,
      serverConfigured: true,
      userLinked: true,
      userLinkedAt: now,
    })
  }

  const auth = await requireUser(_req)
  if (auth instanceof NextResponse) return auth

  const { data, error } = await auth.supabase
    .from("users")
    .select("health_preferences")
    .eq("id", auth.userId)
    .maybeSingle()

  if (error) {
    console.error("hevy status GET:", error.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer preferencias" }, { status: 500 })
  }

  const raw = data?.health_preferences
  const prefs =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as HealthPreferencesPayload) : {}
  const userLinkedAt = hevyLinkedAtFromPreferences(prefs)

  return NextResponse.json({
    success: true,
    serverConfigured: isHevyEnvConfigured(),
    userLinked: Boolean(userLinkedAt),
    userLinkedAt,
  })
}
