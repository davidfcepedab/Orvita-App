import type { HabitCompletionMetrics } from "@/lib/habits/habitMetrics"

export type OperationalDomain = "salud" | "fisico" | "profesional" | "agenda"

export type HabitSuccessMetricType = "duracion" | "repeticiones" | "cantidad" | "si_no"

/** Tipo de hábito para UI y reglas (p. ej. seguimiento de agua con ml). */
export type HabitTypeId = "standard" | "water-tracking"

/** Configuración additive en operational_habits.metadata (jsonb). */
export type HabitMetadata = {
  /** Por defecto ausente = hábito estándar (toggle diario binario). */
  habit_type?: HabitTypeId
  /** Meta y unidades para habit_type water-tracking */
  water_bottle_ml?: number
  water_goal_ml?: number
  water_glass_ml?: number
  /** Peso corporal (kg) opcional para sugerir meta (peso × 32 ml). */
  body_weight_kg?: number
  frequency?: "diario" | "semanal"
  /** Día UTC 0–6 (getUTCDay): 0 dom … 6 sáb */
  weekdays?: number[]
  is_superhabit?: boolean
  /** Letras UI para mostrar (L…D) */
  display_days?: string[]
  /** Por qué existe el hábito; ancla motivacional */
  intention?: string
  success_metric_type?: HabitSuccessMetricType
  /** Meta numérica o texto según tipo (p. ej. min, reps, unidades) */
  success_metric_target?: string
  /** Tiempo de bloque estimado por sesión (minutos) */
  estimated_session_minutes?: number
  /** Disparador u horario preferido (texto libre) */
  trigger_or_time?: string
}

export interface OperationalTask {
  id: string
  title: string
  completed: boolean
  domain: OperationalDomain
  created_at: string
}

export interface OperationalHabit {
  id: string
  name: string
  completed: boolean
  domain: OperationalDomain
  created_at: string
  metadata?: HabitMetadata
}

/** Hábito operacional + métricas derivadas de habit_completions (API /habits enriquecido). */
export interface HabitWithMetrics extends OperationalHabit {
  metrics: HabitCompletionMetrics
  /** Solo water-tracking: ml registrados hoy (zona agenda). */
  water_today_ml?: number
}

export interface Checkin {
  id: string
  score_global: number | null
  score_fisico: number | null
  score_salud: number | null
  score_profesional: number | null
  created_at: string
}

/** Instantánea Apple Health / `health_metrics` para cruzar con check-ins en todo el sistema. */
export type AppleHealthContextSignals = {
  observed_at: string
  source: string | null
  sleep_hours: number | null
  hrv_ms: number | null
  readiness_score: number | null
  steps: number | null
  calories: number | null
  energy_index: number | null
  workouts_count: number | null
  workout_minutes: number | null
  /** Frecuencia cardíaca en reposo (Apple / metadatos del import), si vino en el paquete. */
  resting_hr_bpm: number | null
  /** true si la última muestra tiene más de ~36 h (convén reimportar). */
  sync_stale: boolean
}

export interface OperationalContextData {
  score_global: number
  score_fisico: number
  score_salud: number
  score_profesional: number
  score_disciplina: number
  score_recuperacion: number
  delta_global: number
  delta_disciplina: number
  delta_recuperacion: number
  delta_tendencia: number
  tendencia_7d: { value: number }[]
  prediction: unknown
  insights: string[]
  /** null = sin datos Apple recientes en `health_metrics`. */
  apple_health: AppleHealthContextSignals | null
  today_tasks: OperationalTask[]
  habits: OperationalHabit[]
  next_action?: string
  next_impact?: string
  next_time_required?: string
  current_block?: string
  /** Id de `operational_tasks` cuando el foco viene de la cola operativa (PATCH /api/tasks). */
  next_task_id?: string
  /** Dominio del foco para acentos de UI (p. ej. /hoy). */
  command_focus_domain?: OperationalDomain
}


