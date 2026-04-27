import type { BodyMetricDisplayRow } from "@/lib/training/trainingPrefsTypes"
import type { TrainingDay } from "@/src/modules/training/types"

export type DeltaQuality = "good" | "warn" | "neutral"

export function parseMetricNumber(raw: string | undefined): number | null {
  if (!raw) return null
  const n = parseFloat(String(raw).replace(/[^\d.,-]/g, "").replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** Masa magra ≈ peso × (1 − %grasa/100). Devuelve null si los datos están fuera de rango plausible. */
export function estimateLeanMassKg(weightKg: number, fatPct: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(fatPct)) return null
  if (weightKg <= 30) return null
  if (fatPct < 3 || fatPct > 60) return null
  return weightKg * (1 - fatPct / 100)
}

export function bodyCompositionChartPoints(weightRow: BodyMetricDisplayRow | undefined, fatRow: BodyMetricDisplayRow | undefined) {
  const pts: { label: string; weight: number; fatPct: number }[] = []
  if (!weightRow || !fatRow) return pts
  const wPrev = parseMetricNumber(weightRow.previous)
  const wCur = parseMetricNumber(weightRow.current)
  const wProj = parseMetricNumber(weightRow.projection)
  const fPrev = parseMetricNumber(fatRow.previous)
  const fCur = parseMetricNumber(fatRow.current)
  const fProj = parseMetricNumber(fatRow.projection)
  if (wCur == null || fCur == null) return pts
  if (wPrev != null && fPrev != null) pts.push({ label: "Ant.", weight: wPrev, fatPct: fPrev })
  pts.push({ label: "Ahora", weight: wCur, fatPct: fCur })
  if (wProj != null && fProj != null) pts.push({ label: "Proyección", weight: wProj, fatPct: fProj })
  return pts.length >= 2 ? pts : pts.length === 1 ? [pts[0], { ...pts[0], label: "Hoy" }] : []
}

export function deltaQualityFromTrend(trend: "up" | "down", kind: "weight" | "fat"): DeltaQuality {
  if (kind === "weight") return trend === "down" ? "good" : trend === "up" ? "warn" : "neutral"
  return trend === "down" ? "good" : trend === "up" ? "warn" : "neutral"
}

export function deltaQualityLabel(q: DeltaQuality): string {
  if (q === "good") return "Señal favorable"
  if (q === "warn") return "A vigilar"
  return "Estable"
}

export function countWeeklySets(days: TrainingDay[]): number {
  let fromEx = 0
  let hasEx = false
  for (const day of days) {
    for (const ex of day.exercises ?? []) {
      fromEx += ex.sets?.length ?? 0
      hasEx = true
    }
  }
  if (hasEx) return fromEx
  return Math.round(days.reduce((s, d) => s + (d.totalSets ?? 0), 0))
}

export function trainingStreakDays(days: TrainingDay[], todayIso: string): number {
  const byDate = new Map(days.map((x) => [x.date, x]))
  let streak = 0
  let d = todayIso
  let skippedTodayIfEmpty = false
  for (let i = 0; i < 400; i++) {
    const day = byDate.get(d)
    const ok = day && (day.status === "trained" || day.status === "swim")
    if (ok) {
      streak++
      d = addDaysYmd(d, -1)
    } else {
      if (!skippedTodayIfEmpty && d === todayIso) {
        skippedTodayIfEmpty = true
        d = addDaysYmd(d, -1)
        continue
      }
      break
    }
  }
  return streak
}

function addDaysYmd(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function intraWorkoutCarbsG(plannedToday: string): number {
  const p = plannedToday.toLowerCase()
  if (p.includes("cardio")) return 15
  if (p.includes("leg") || p.includes("lower") || p.includes("pierna")) return 30
  return 25
}

export function cnsFatigueLabel(readinessScore: number): string {
  if (readinessScore >= 72) return "Baja"
  if (readinessScore >= 52) return "Media"
  return "Alta"
}

export function advisorStatusLabel(readinessScore: number, nutritionOk: boolean): string {
  if (readinessScore >= 70 && nutritionOk) return "Optimizado"
  if (readinessScore >= 52) return "En equilibrio"
  return "Prioriza recuperación"
}

export function hypertrophyRateHint(zonesAvgProgress: number): string {
  if (zonesAvgProgress <= 0) return "Activa volumen esta semana"
  const pct = (zonesAvgProgress / 100) * 0.6
  return `${pct.toFixed(1)}% / sem (est.)`
}

export function formatDeadlineYm(ym: string | null | undefined): string | null {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return null
  const [y, m] = ym.split("-").map(Number)
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("es", { month: "short" })
  return `${month} ${y}`
}
