/**
 * Block 1 feature flags (additive).
 * - Mock: demo mode — check-in API skips real Supabase persistence.
 * - Supabase check-in: explicit opt-in via NEXT_PUBLIC_SUPABASE_ENABLED === "true".
 */

export type AppMode = "mock" | "standard"

/** NEXT_PUBLIC_APP_MODE === "mock" */
export function isAppMockMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE === "mock"
}

/**
 * Supabase persistence for check-in POST (and related flows).
 * Solo es true cuando la variable pública es exactamente "true".
 */
export function isSupabaseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"
}

/** @deprecated Usar isSupabaseEnabled() — se mantiene por compatibilidad con Bloque 1. */
export function isSupabaseCheckinPersistenceEnabled(): boolean {
  return isSupabaseEnabled()
}

export function getAppMode(): AppMode {
  return isAppMockMode() ? "mock" : "standard"
}

/** Coherencia API ↔ UI (preload / futuros clientes). */
export function getCheckinApiFlagsSnapshot() {
  return {
    appMode: getAppMode(),
    supabasePersistenceEnabled: isSupabaseEnabled(),
  }
}

export const CHECKIN_SUPABASE_DISABLED_CODE = "SUPABASE_PERSISTENCE_DISABLED" as const

export const CHECKIN_SUPABASE_DISABLED_MESSAGE =
  "Persistencia en Supabase desactivada. Establece NEXT_PUBLIC_SUPABASE_ENABLED=true en el entorno, reconstruye la app (Next inlining) y vuelve a cargar."

export const CHECKIN_SUPABASE_DISABLED_HINT =
  "Sin este flag, POST /api/checkin no escribirá filas en public.checkins (salvo modo mock, que solo simula la respuesta)."


