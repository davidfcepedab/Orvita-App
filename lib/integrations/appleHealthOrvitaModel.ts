/**
 * Modelo de datos Salud ↔ Órvita (importación, no HealthKit en web).
 *
 * **Lectura hacia Órvita:** el atajo de iOS arma un JSON (`apple_bundle` o `entries`) que el servidor
 * guarda en `health_metrics` (columnas + `metadata`). Prioridad para correlaciones: sueño, variación del
 * latido, ritmo en reposo, disposición, pasos, calorías de movimiento, sesiones y minutos de entreno.
 *
 * **Escritura desde Órvita hacia Apple Health:** la web/PWA no puede usar HealthKit. No escribimos en
 * la app Salud del iPhone desde el servidor. Para reflejar algo en Salud hace falta un atajo que
 * *guarde* muestras en Health, o una app nativa. Lo que sí hacemos es guardar en Supabase (agua,
 * suplementos, check-ins) y mostrarlo en Órvita; si en el futuro quisieras duplicar agua en Salud,
 * sería un segundo atajo “escribir en Salud” disparado por el usuario.
 */

/** Claves que el atajo puede enviar en el cuerpo (ver `mergeAppleHealthImportRows`). */
export const ORVITA_APPLE_IMPORT_BUNDLE_KEYS = [
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

/** Columnas numéricas persistidas en `health_metrics` (además de user_id, observed_at, source, metadata). */
export const ORVITA_HEALTH_METRICS_COLUMNS = [
  "sleep_hours",
  "hrv_ms",
  "readiness_score",
  "steps",
  "calories",
  "energy_index",
] as const
