import type {
  Checkin,
  OperationalHabit,
  OperationalTask,
  OperationalDomain,
} from "@/lib/operational/types"

export type OperationalTaskRow = {
  id: string
  title: string
  completed: boolean
  domain: OperationalDomain
  created_at: string
}

export type OperationalHabitRow = {
  id: string
  name: string
  completed: boolean
  domain: OperationalDomain
  created_at: string
}

export type CheckinRow = {
  id: string
  score_global: number | null
  score_fisico: number | null
  score_salud: number | null
  score_profesional: number | null
  created_at: string
}

export function mapOperationalTask(row: OperationalTaskRow): OperationalTask {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    domain: row.domain,
    created_at: row.created_at,
  }
}

export function mapOperationalHabit(row: OperationalHabitRow): OperationalHabit {
  return {
    id: row.id,
    name: row.name,
    completed: row.completed,
    domain: row.domain,
    created_at: row.created_at,
  }
}

export function mapCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    score_global: row.score_global,
    score_fisico: row.score_fisico,
    score_salud: row.score_salud,
    score_profesional: row.score_profesional,
    created_at: row.created_at,
  }
}
