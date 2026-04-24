/**
 * Mapa de lo que Órvita puede guardar hoy vía importación de Apple (Atajo) y tabla `health_metrics`.
 * Útil para alinear producto, prompts de IA y documentación interna. El usuario ve siempre nombres en castellano en la app.
 */

import { APPLE_SHORTCUT_BUNDLE_INPUT_KEYS } from "@/lib/integrations/appleHealthBundleContract"

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

/** Reexport del contrato único (`lib/integrations/appleHealthBundleContract.ts`). */
export { APPLE_SHORTCUT_BUNDLE_INPUT_KEYS }

/** En `metadata` suelen quedar, entre otras: apple_workouts_count, apple_workouts_duration_seconds, shortcut_bundle_keys; las columnas explícitas son preferentes en lectura. */
export const HEALTH_METRICS_METADATA_NOTES = {
  apple_workouts: "Número y duración de entrenos que Apple asoció al día (si el atajo las envió).",
  merge: "La fila mezcla columnas y metadatos para no perder nada de lo que manda el iPhone.",
  health_signals:
    "Instantánea numérica canónica del mismo día (claves alineadas con el contrato del atajo; SpO₂ como % derivada de oxygen_saturation_avg si aplica).",
} as const
