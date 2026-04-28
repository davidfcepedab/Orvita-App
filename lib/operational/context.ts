import type {
  AppleHealthContextSignals,
  Checkin,
  OperationalCapitalSnapshot,
  OperationalContextData,
  OperationalHabit,
  OperationalTask,
} from "@/lib/operational/types"
import { buildAppleOperationalInsights } from "@/lib/health/appleOperationalMerge"
import { buildStrategicCorrelatedInsights } from "@/lib/insights/buildStrategicDay"
import { applyDerivedCommandFocusToContext } from "@/lib/hoy/commandDerivation"

function normalizeScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** Pulso “salud” por check-in: prioriza score_salud; si falta, promedia lo disponible. */
function scoreSaludOrFallback(c: Checkin): number {
  const s = c.score_salud
  if (typeof s === "number" && Number.isFinite(s)) return s
  const parts: number[] = []
  if (typeof c.score_fisico === "number" && Number.isFinite(c.score_fisico)) parts.push(c.score_fisico)
  if (typeof c.score_profesional === "number" && Number.isFinite(c.score_profesional)) parts.push(c.score_profesional)
  if (typeof c.score_global === "number" && Number.isFinite(c.score_global)) parts.push(c.score_global)
  if (parts.length === 0) return 0
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

export function buildOperationalContext(params: {
  tasks: OperationalTask[]
  habits: OperationalHabit[]
  latestCheckin: Checkin | null
  /** Hasta 7 check-ins, más reciente primero (misma query que el último). Alimenta tendencia_7d y deltas MoM. */
  recentCheckinsDesc?: Checkin[] | null
  /** Última fila `health_metrics` (Apple / importación). null = sin señales recientes. */
  appleHealthLatest?: AppleHealthContextSignals | null
  /** Belvo + resumen mensual (hogar). null si aún no hay señal. */
  capital?: OperationalCapitalSnapshot | null
}): OperationalContextData {
  const latest = params.latestCheckin
  const score_global_raw = latest?.score_global
  const score_fisico = normalizeScore(latest?.score_fisico)
  const score_salud = normalizeScore(latest?.score_salud)
  const score_profesional = normalizeScore(latest?.score_profesional)
  const score_global =
    typeof score_global_raw === "number" && Number.isFinite(score_global_raw)
      ? score_global_raw
      : Math.round((score_fisico + score_salud + score_profesional) / 3)

  const recent = params.recentCheckinsDesc ?? []
  const chronological = [...recent].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const last7 = chronological.slice(-7)
  const tendencia_7d = last7.map((c) => ({ value: scoreSaludOrFallback(c) }))

  let delta_recuperacion = 0
  let delta_disciplina = 0
  if (chronological.length >= 2) {
    const last = chronological[chronological.length - 1]!
    const prev = chronological[chronological.length - 2]!
    delta_recuperacion = scoreSaludOrFallback(last) - scoreSaludOrFallback(prev)
    delta_disciplina = normalizeScore(last.score_profesional) - normalizeScore(prev.score_profesional)
  }

  const apple_health = params.appleHealthLatest ?? null
  const appleInsights = buildAppleOperationalInsights(score_salud, score_fisico, apple_health)
  const capital = params.capital ?? null

  const base: OperationalContextData = {
    score_global,
    score_fisico,
    score_salud,
    score_profesional,
    score_disciplina: score_profesional,
    score_recuperacion: score_salud,
    delta_global: 0,
    delta_disciplina,
    delta_recuperacion,
    delta_tendencia: 0,
    tendencia_7d,
    prediction: null,
    insights: appleInsights,
    apple_health,
    capital,
    today_tasks: params.tasks,
    habits: params.habits,
  }

  const strategicDay = buildStrategicCorrelatedInsights(base)
  const merged: OperationalContextData = {
    ...base,
    insights: [...strategicDay, ...appleInsights],
  }

  return applyDerivedCommandFocusToContext(merged)
}
