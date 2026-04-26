import { addCalendarDaysYmd } from "@/lib/agenda/calendarMath"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import type { AppleHealthContextSignals } from "@/lib/operational/types"
import type { TrainingDay, TrainingExercise, TrainingTodayState } from "@/src/modules/training/types"

type ReadinessLabel = "Listo para entrenar" | "Entrenar suave" | "Priorizar recuperación" | "Ajustar volumen"

export type TrainingReadiness = {
  score: number
  label: ReadinessLabel
  rationale: string
}

export type WeeklyTimelineItem = {
  date: string
  label: string
  plan: string
  executed: string | null
  status: "done" | "pending" | "moved" | "rest"
}

export type PlanVsExecution = {
  plannedToday: string
  executedToday: string | null
  adherencePct: number
  suggestion: string
}

export type TrainingInconsistency = {
  id: string
  message: string
}

export type GoalAlignmentResult = {
  aligned: boolean
  insight: string
  actionables: [string, string]
  risk: string | null
}

const PLAN_SEQUENCE = ["Push", "Pull", "Legs", "Upper", "Descanso", "Lower", "Cardio"] as const

export function buildTrainingReadiness(
  apple: AppleHealthContextSignals | null,
  days: TrainingDay[],
): TrainingReadiness {
  const recentLoad = days.slice(0, 3).reduce((sum, day) => sum + (day.volumeScore ?? 0), 0)
  const sleep = apple?.sleep_hours ?? null
  const hrv = apple?.hrv_ms ?? null
  const restingHr = apple?.resting_hr_bpm ?? null

  let score = 62
  if (sleep != null) score += sleep >= 7 ? 12 : sleep >= 6 ? 5 : -8
  if (hrv != null) score += hrv >= 50 ? 8 : hrv >= 35 ? 2 : -7
  if (restingHr != null) score += restingHr <= 58 ? 6 : restingHr <= 66 ? 0 : -6
  if (recentLoad > 1800) score -= 10
  else if (recentLoad > 900) score -= 4
  score = clamp(score, 22, 95)

  if (score >= 76) {
    return { score, label: "Listo para entrenar", rationale: "Tu recuperación y carga reciente permiten una sesión normal." }
  }
  if (score >= 61) {
    return { score, label: "Entrenar suave", rationale: "Mantén la sesión, pero baja una serie pesada o el RPE final." }
  }
  if (score >= 46) {
    return { score, label: "Ajustar volumen", rationale: "Conviene reducir volumen hoy para no acumular fatiga." }
  }
  return { score, label: "Priorizar recuperación", rationale: "Hoy prioriza movilidad, sueño y caminata ligera." }
}

export function buildWeeklyTimeline(days: TrainingDay[], todayIso = agendaTodayYmd()): WeeklyTimelineItem[] {
  const byDate = new Map<string, TrainingDay>()
  for (const day of days) {
    if (!byDate.has(day.date)) byDate.set(day.date, day)
  }
  const monday = startOfWeekMonday(todayIso)
  return Array.from({ length: 7 }).map((_, index) => {
    const date = addCalendarDaysYmd(monday, index)
    const plan = planForDate(date)
    const executed = byDate.get(date)
    const status = classifyTimelineStatus(executed, plan, date, todayIso)
    return {
      date,
      label: formatWeekLabel(date),
      plan,
      executed: executed?.workoutName ?? null,
      status,
    }
  })
}

export function buildPlanVsExecution(
  days: TrainingDay[],
  todayState: TrainingTodayState,
  todayIso = agendaTodayYmd(),
): PlanVsExecution {
  const plannedToday = planForDate(todayIso)
  const today = days.find((day) => day.date === todayIso) ?? null
  const executedToday = today?.workoutName ?? null
  const week = buildWeeklyTimeline(days, todayIso)
  const doneCount = week.filter((item) => item.status === "done").length
  const trainableCount = week.filter((item) => item.plan !== "Descanso").length
  const adherencePct = trainableCount > 0 ? Math.round((doneCount / trainableCount) * 100) : 0

  const suggestion =
    todayState === "pending" && plannedToday !== "Descanso"
      ? `Si hoy no se completa ${plannedToday}, muévelo a mañana y desplaza la secuencia sin duplicar.`
      : todayState === "moved"
        ? "Sesión movida detectada: mantén la secuencia y evita duplicar bloques pesados."
        : todayState === "rest"
          ? "Día de descanso útil: protege sueño y camina suave para sostener la semana."
          : "Sesión completada: conserva el orden y prioriza recuperación para mañana."

  return { plannedToday, executedToday, adherencePct, suggestion }
}

export function buildInconsistencies(
  apple: AppleHealthContextSignals | null,
  plan: PlanVsExecution,
  lastSession: TrainingDay | null,
): TrainingInconsistency[] {
  const issues: TrainingInconsistency[] = []
  if ((apple?.workout_minutes ?? 0) > 20 && !lastSession) {
    issues.push({
      id: "apple_without_hevy",
      message: "Apple detectó actividad, pero no hay sesión estructurada en Hevy.",
    })
  }
  if (lastSession && (apple?.workout_minutes ?? 0) === 0) {
    issues.push({
      id: "hevy_without_apple",
      message: "Hay sesión en Hevy, pero Apple no reporta minutos de entrenamiento aún.",
    })
  }
  if (plan.executedToday && !matchesPlan(plan.plannedToday, plan.executedToday)) {
    issues.push({
      id: "plan_mismatch",
      message: `Hoy estaba planeado ${plan.plannedToday}, pero Hevy registra ${plan.executedToday}.`,
    })
  }
  return issues
}

export function buildGoalAlignment(
  readiness: TrainingReadiness,
  plan: PlanVsExecution,
  days: TrainingDay[],
): GoalAlignmentResult {
  const last7Volume = days.slice(0, 7).reduce((sum, day) => sum + (day.volumeScore ?? 0), 0)
  const aligned = plan.adherencePct >= 60 && last7Volume >= 900
  const lowLegVolume = !days.some((day) => /leg|pierna|lower/i.test(day.workoutName ?? ""))
  const insight = aligned
    ? "Tu plan va alineado con el objetivo semanal."
    : "Hay desviaciones entre lo planeado y lo ejecutado esta semana."
  const firstAction = lowLegVolume
    ? "Incluye una sesión corta de pierna o lower esta semana para balancear volumen."
    : "Mantén la secuencia semanal y evita saltar dos días seguidos."
  const secondAction =
    readiness.score < 60
      ? "Reduce una serie pesada hoy y prioriza movilidad + sueño."
      : "Sostén progresión suave: añade 1 serie efectiva al grupo rezagado."
  const risk =
    readiness.score < 46
      ? "Riesgo de acumular fatiga si mantienes intensidad alta sin recuperación."
      : plan.adherencePct < 40
        ? "Riesgo de estancamiento por baja adherencia semanal."
        : null
  return { aligned, insight, actionables: [firstAction, secondAction], risk }
}

export function pickLastHevySession(days: TrainingDay[]): TrainingDay | null {
  return days.find((day) => day.source === "hevy") ?? null
}

export function summarizeTopExercises(exercises: TrainingExercise[] | undefined): string[] {
  if (!Array.isArray(exercises) || exercises.length === 0) return []
  return exercises
    .slice(0, 3)
    .map((exercise) => `${exercise.name} · ${exercise.sets.length} sets`)
}

function planForDate(date: string): string {
  const anchor = Date.parse(`${date}T12:00:00Z`)
  if (Number.isNaN(anchor)) return "Push"
  const idx = new Date(anchor).getUTCDay() % PLAN_SEQUENCE.length
  return PLAN_SEQUENCE[idx] ?? "Push"
}

function startOfWeekMonday(date: string): string {
  const anchor = Date.parse(`${date}T12:00:00Z`)
  if (Number.isNaN(anchor)) return date
  const utcDay = new Date(anchor).getUTCDay()
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay
  return addCalendarDaysYmd(date, diffToMonday)
}

function formatWeekLabel(date: string): string {
  const anchor = Date.parse(`${date}T12:00:00Z`)
  if (Number.isNaN(anchor)) return date.slice(5)
  const day = new Date(anchor).getUTCDay()
  const names = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
  return `${names[day] ?? ""} ${date.slice(8, 10)}`
}

function classifyTimelineStatus(
  executed: TrainingDay | undefined,
  plan: string,
  date: string,
  todayIso: string,
): WeeklyTimelineItem["status"] {
  if (plan === "Descanso") return "rest"
  if (executed?.status === "trained" || executed?.status === "swim") return "done"
  if (executed?.status === "skip") return "moved"
  if (date < todayIso) return "moved"
  return "pending"
}

function matchesPlan(planName: string, executedName: string): boolean {
  const p = planName.toLowerCase()
  const e = executedName.toLowerCase()
  if (p === "descanso") return /rest|descanso/.test(e)
  if (p === "legs" || p === "lower") return /leg|lower|pierna/.test(e)
  if (p === "push") return /push|pecho|hombro|triceps/.test(e)
  if (p === "pull") return /pull|espalda|biceps/.test(e)
  return e.includes(p)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
