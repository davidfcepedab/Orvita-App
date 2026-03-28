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

/** Respuesta API / mensajes de error: sin nombres de variables de entorno. */
export const CHECKIN_SUPABASE_DISABLED_MESSAGE =
  "El check-in no se puede guardar en la nube con la configuración actual. Activa la sincronización con base de datos en el panel de alojamiento y vuelve a publicar la app, o usa el modo demostración si está disponible."

export const CHECKIN_SUPABASE_DISABLED_HINT =
  "Mientras la sincronización con base de datos esté desactivada, el guardado permanente no está disponible (salvo en modo demostración, que solo simula la respuesta)."

/**
 * Texto para UI y avisos de API: lenguaje de producto (deploy / administrador), no nombres de .env.
 */
export const UI_SYNC_OFF_SHORT =
  "La sincronización con la nube no está activa; parte de los datos son locales o de demostración."

export const UI_HABITS_MUTATIONS_OFF =
  "La sincronización con tu cuenta no está activa: no puedes crear hábitos ni guardar «Hecho hoy» en la nube."

export const UI_HABITS_SAVE_OFF = "No se puede guardar en la nube sin sincronización con tu cuenta activa."

export const UI_FINANCE_DEMO_MONTH = "No hay resumen financiero real para este mes."

export const UI_FINANCE_DEMO_NOTICE =
  "Se muestran datos de ejemplo. Con la sincronización activa verás tus movimientos reales."

export const UI_GOOGLE_CALENDAR_OFF =
  "Para ver tus eventos reales de Google Calendar hace falta tener la sincronización con cuenta activada en el servidor."

export const UI_GOOGLE_TASKS_OFF =
  "Para sincronizar tareas con Google hace falta tener la sincronización con cuenta activada en el servidor."

export const UI_HEALTH_SUPPLEMENTS_LOCAL =
  "Los suplementos se guardan en este navegador. Con la sincronización activa podrán asociarse a tu cuenta."

export const UI_TRAINING_PREFS_LOCAL =
  "Las preferencias de entreno se guardan en este navegador. Con la sincronización activa podrán asociarse a tu cuenta."

export const UI_SUBSCRIPTIONS_LOCAL_STORAGE =
  "Los datos se guardan en este navegador. Con la sincronización activa se replican en tu cuenta."

export const UI_AGENDA_SYNC_OFF =
  "Activa la sincronización con cuenta en el servidor para poder sincronizar con la nube desde aquí."

export const UI_HEALTH_CONTEXT_ERROR =
  "No pudimos cargar el panel de bienestar. Inicia sesión si aplica, comprueba tu conexión o inténtalo más tarde."

/** Avisos JSON en rutas API (breves). */
export const API_NOTICE_MANUAL_ITEMS_LOCAL =
  "Ítems manuales solo en este dispositivo hasta activar la sincronización con cuenta."

export const API_NOTICE_SUBSCRIPTIONS_LOCAL =
  "Suscripciones en este dispositivo hasta activar la sincronización con cuenta."

export const API_CHECKIN_MOCK_SUCCESS_DETAIL =
  "Modo demostración: respuesta simulada; no se escribió en la base de datos."

export const API_CHECKIN_PRELOAD_MOCK_NO_SYNC =
  "Precarga simulada. El guardado permanente en base de datos no está disponible con la configuración actual."

export const API_CHECKIN_PRELOAD_EMPTY_NO_SYNC =
  "Precarga vacía; el guardado en base de datos no está disponible con la configuración actual."

export const API_CHECKIN_PRELOAD_SHEETS_NO_ROWS_NO_SYNC =
  "Sin filas para precargar en Sheets. El guardado en base de datos requiere sincronización activa en el servidor."

export const API_CHECKIN_PRELOAD_NO_ROW_NO_SYNC =
  "No hay fila útil para precargar; el guardado en base de datos sigue desactivado."

export const API_CHECKIN_PRELOAD_SHEETS_OK_NO_SYNC =
  "Precarga desde Sheets lista. Para persistir en base de datos, activa la sincronización en el servidor y vuelve a publicar la app."

export const API_GOOGLE_MUTATION_NO_SYNC =
  "No se puede crear en Google sin sincronización de cuenta en el servidor."

export const UI_CHECKIN_BANNER_MOCK =
  "Modo demostración activo: el guardado es simulado; no se escribe en la base de datos real."

export const UI_CHECKIN_BANNER_NO_CLOUD =
  "El check-in no se guardará en la nube con la configuración actual. Activa la sincronización en el panel de alojamiento y vuelve a publicar la app, o usa el modo demostración si está disponible."

export const UI_CHECKIN_SAVE_DISABLED_FOOTER =
  "Usa modo demostración o activa la sincronización en la nube para poder guardar."


