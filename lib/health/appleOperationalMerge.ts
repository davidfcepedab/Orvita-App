import type { AppleHealthContextSignals } from "@/lib/operational/types"

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** Última fila `health_metrics` → señales unificadas para `OperationalContextData`. */
export function mapHealthMetricsRowToAppleSignals(row: unknown): AppleHealthContextSignals | null {
  if (!row || typeof row !== "object") return null
  const r = row as Record<string, unknown>
  const observed_at = typeof r.observed_at === "string" ? r.observed_at : null
  if (!observed_at) return null

  const metaRaw = r.metadata
  const meta = metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw) ? (metaRaw as Record<string, unknown>) : {}

  const wds = num(meta.apple_workouts_duration_seconds)
  const workout_minutes = wds != null && wds > 0 ? Math.round(wds / 60) : null

  const ageMs = Date.now() - Date.parse(observed_at)
  const sync_stale = Number.isFinite(ageMs) && ageMs > 36 * 60 * 60 * 1000

  return {
    observed_at,
    source: typeof r.source === "string" ? r.source : null,
    sleep_hours: num(r.sleep_hours),
    hrv_ms: num(r.hrv_ms),
    readiness_score: num(r.readiness_score),
    steps: num(r.steps),
    calories: num(r.calories),
    energy_index: num(r.energy_index),
    workouts_count: num(meta.apple_workouts_count),
    workout_minutes,
    sync_stale,
  }
}

/**
 * Pistas accionables que conectan Apple Health con el check-in (sin sustituir scores clínicos).
 * El primer elemento es el más urgente (sirve de `next_action` fallback cuando no hay tareas).
 */
export function buildAppleOperationalInsights(
  scoreSalud: number,
  scoreFisico: number,
  apple: AppleHealthContextSignals | null,
): string[] {
  if (!apple) return []
  const out: string[] = []

  if (apple.sync_stale) {
    out.push("Tu importación de Apple Health tiene más de 36 h: corre el Atajo para que Órvita siga el ritmo real del día.")
  }

  const sleep = apple.sleep_hours
  if (sleep != null && sleep < 6 && scoreSalud >= 62) {
    out.push(
      `Apple registró ~${sleep.toFixed(1)} h de sueño mientras tu check-in de salud se siente alto (${scoreSalud}). Vale la pena bajar el acelerador hoy.`,
    )
  }

  const readiness = apple.readiness_score
  if (readiness != null && readiness < 48 && scoreSalud >= 65) {
    out.push(
      `Tu “readiness” en Apple (${readiness}) está bajo frente a un check-in optimista (${scoreSalud}). Prioriza descanso y hidratación antes de exigirte más.`,
    )
  }

  const wn = apple.workouts_count ?? 0
  const steps = apple.steps ?? 0
  if (wn > 0 && steps > 0 && steps < 2500) {
    out.push(
      "Apple ve entreno(s) con pocos pasos: posible sesión de fuerza o bici. No confundas “poco caminar” con “día liviano”.",
    )
  }

  if (apple.hrv_ms != null && apple.hrv_ms < 28 && scoreFisico >= 72) {
    out.push(
      `HRV bajo en Apple (${apple.hrv_ms} ms) con cuerpo alto en check-in (${scoreFisico}). Puede ser fatiga acumulada: revisa sueño y cafeína.`,
    )
  }

  return out.slice(0, 3)
}
