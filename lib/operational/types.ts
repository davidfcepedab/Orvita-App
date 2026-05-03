import type { HabitCompletionMetrics } from "@/lib/habits/habitMetrics"

export type OperationalDomain = "salud" | "fisico" | "profesional" | "agenda"

/** Foco de Palanca #1 (p. ej. comando derivado); no se usa en creación de tareas/hábitos. */
export type OperationalCommandDomain = OperationalDomain | "capital"

/** Presión de capital alineada a producto (alta / media / baja). */
export type CapitalPressureLevel = "baja" | "media" | "alta"

/** Instantánea Capital + Belvo para el sistema operativo estratégico. */
export type OperationalCapitalSnapshot = {
  totalBalanceCop: number
  monthlyNetCop: number
  pressure: CapitalPressureLevel
  lastBankSyncAt: string | null
  connectedAccounts: number
  belvoSandbox: boolean
  /** Link sandbox degradado (consent BR) aún con movimiento operativo. */
  sandboxDegraded: boolean
}

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
  /**
   * Hábito tipo sí/no con varios chequeos en el día (p. ej. impulsos).
   * La UI de checkpoints / push queda enlazada en siguientes iteraciones.
   */
  intraday_si_no_progress?: boolean
  /** Objetivo de respuestas Sí/No en el día cuando `intraday_si_no_progress` es true. */
  intraday_si_no_target_checks?: number
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
  /** YYYY-MM-DD del bundle (atajo); redundante con `observed_at` serializado pero útil sin `metadata` en cliente. */
  bundle_day_ymd?: string | null
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
  /** true si la última muestra tiene más de ~36 h (conviene reimportar). */
  sync_stale: boolean
  /** Instantánea numérica canónica (`metadata.health_signals`) alineada con `appleHealthBundleContract`. */
  health_signals: Record<string, number> | null
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
  /** Capital (Belvo + flujo mensual del hogar); null si no hay datos útiles. */
  capital: OperationalCapitalSnapshot | null
  today_tasks: OperationalTask[]
  habits: OperationalHabit[]
  next_action?: string
  next_impact?: string
  next_time_required?: string
  current_block?: string
  /** Id de `operational_tasks` cuando el foco viene de la cola operativa (PATCH /api/tasks). */
  next_task_id?: string
  /** Dominio del foco para acentos de UI (p. ej. /hoy). */
  command_focus_domain?: OperationalCommandDomain
}


