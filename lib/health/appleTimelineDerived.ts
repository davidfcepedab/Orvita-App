import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Vitalidad diaria a partir de sueño + movimiento (sin HRV/FC).
 * Se separa de `readiness_score` / `energy_index` porque en importaciones Apple
 * esos campos suelen ser el mismo valor generado.
 */
export function vitalityScoreFromAppleRow(row: Pick<AutoHealthMetric, "sleep_hours" | "steps">): number {
  const sleep = row.sleep_hours
  const steps = row.steps
  const sleepScore = sleep == null ? 50 : clamp(Math.round(sleep * 12), 0, 100)
  const moveScore = steps == null ? 50 : clamp(Math.round((steps / 12_000) * 100), 0, 100)
  return clamp(Math.round(sleepScore * 0.45 + moveScore * 0.55), 0, 100)
}

export function dedupeMetricsByLocalDay(rows: AutoHealthMetric[]): AutoHealthMetric[] {
  const map = new Map<string, AutoHealthMetric>()
  for (const row of rows) {
    const key =
      localDateKeyFromIso(row.observed_at) ??
      (typeof row.observed_at === "string" && row.observed_at.length >= 10 ? row.observed_at.slice(0, 10) : "")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const prev = map.get(key)
    if (!prev || new Date(row.observed_at).getTime() > new Date(prev.observed_at).getTime()) {
      map.set(key, row)
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
}
