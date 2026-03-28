import { NextResponse } from "next/server"
import { isAppMockMode, isSupabaseEnabled, UI_HABITS_MUTATIONS_OFF } from "@/lib/checkins/flags"

/**
 * Mutaciones de hábitos (CRUD + completado diario) requieren Supabase habilitado,
 * salvo modo mock (sin persistencia real).
 */
export function habitsMutationBlockedResponse(): NextResponse | null {
  if (isAppMockMode()) return null
  if (isSupabaseEnabled()) return null
  return NextResponse.json(
    {
      success: false,
      code: "SUPABASE_PERSISTENCE_DISABLED",
      error: UI_HABITS_MUTATIONS_OFF,
    },
    { status: 403 }
  )
}

