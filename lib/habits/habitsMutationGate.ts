import { NextResponse } from "next/server"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"

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
      error:
        "Mutaciones de hábitos desactivadas: establece NEXT_PUBLIC_SUPABASE_ENABLED=true y reconstruye la app.",
    },
    { status: 403 }
  )
}

