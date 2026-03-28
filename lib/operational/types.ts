import type { HabitCompletionMetrics } from "@/lib/habits/habitMetrics"

export type OperationalDomain = "salud" | "fisico" | "profesional" | "agenda"

/** Configuración additive en operational_habits.metadata (jsonb). */
export type HabitMetadata = {
  frequency?: "diario" | "semanal"
  /** Día UTC 0–6 (getUTCDay): 0 dom … 6 sáb */
  weekdays?: number[]
  is_superhabit?: boolean
  /** Letras UI para mostrar (L…D) */
  display_days?: string[]
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
}

export interface Checkin {
  id: string
  score_global: number | null
  score_fisico: number | null
  score_salud: number | null
  score_profesional: number | null
  created_at: string
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
  today_tasks: OperationalTask[]
  habits: OperationalHabit[]
  next_action?: string
  next_impact?: string
  next_time_required?: string
  current_block?: string
}


