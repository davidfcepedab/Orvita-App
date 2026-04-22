/**
 * Mapa de lo que Órvita puede guardar hoy vía importación de Apple (Atajo) y tabla `health_metrics`.
 * Útil para alinear producto, prompts de IA y documentación interna. El usuario ve siempre nombres en castellano en la app.
 */

/** Columnas numéricas principales de `health_metrics` (además de user_id, observed_at, source, metadata). */
export const HEALTH_METRICS_NUMERIC_KEYS = [
  "sleep_hours",
  "hrv_ms",
  "readiness_score",
  "steps",
  "calories",
  "energy_index",
  "resting_hr_bpm",
  "apple_workouts_count",
  "apple_workout_minutes",
] as const

/**
 * Claves que el atajo puede enviar en el paquete diario; se mapean en `rowsFromAppleBundlePayload`
 * (ver `lib/integrations/mergeAppleHealthImportRows.ts`).
 */
export const APPLE_SHORTCUT_BUNDLE_INPUT_KEYS = [
  "observed_at",
  "steps",
  "active_energy_kcal",
  "sleep_hours",
  "sleep_duration_seconds",
  "hrv_ms",
  "resting_hr_bpm",
  "workouts_count",
  "workouts_minutes",
  "workouts_duration_seconds",
  "readiness_score",
] as const

/** En `metadata` suelen quedar, entre otras: apple_workouts_count, apple_workouts_duration_seconds, shortcut_bundle_keys; las columnas explícitas son preferentes en lectura. */
export const HEALTH_METRICS_METADATA_NOTES = {
  apple_workouts: "Número y duración de entrenos que Apple asoció al día (si el atajo las envió).",
  merge: "La fila mezcla columnas y metadatos para no perder nada de lo que manda el iPhone.",
} as const
