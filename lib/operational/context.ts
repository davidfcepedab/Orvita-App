import type {
  Checkin,
  OperationalContextData,
  OperationalHabit,
  OperationalTask,
} from "@/lib/operational/types"
import { applyDerivedCommandFocusToContext } from "@/lib/hoy/commandDerivation"

function normalizeScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function buildOperationalContext(params: {
  tasks: OperationalTask[]
  habits: OperationalHabit[]
  latestCheckin: Checkin | null
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

  const base: OperationalContextData = {
    score_global,
    score_fisico,
    score_salud,
    score_profesional,
    score_disciplina: score_profesional,
    score_recuperacion: score_salud,
    delta_global: 0,
    delta_disciplina: 0,
    delta_recuperacion: 0,
    delta_tendencia: 0,
    tendencia_7d: [],
    prediction: null,
    insights: [],
    today_tasks: params.tasks,
    habits: params.habits,
  }

  return applyDerivedCommandFocusToContext(base)
}
