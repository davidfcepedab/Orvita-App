export type TrainingStatus = "trained" | "rest" | "skip" | "swim"

export type TrainingSet = {
  reps?: number
  weightKg?: number
  rpe?: number
  durationSec?: number
  distanceM?: number
}

export type TrainingExercise = {
  id?: string
  name: string
  muscleGroup?: string | null
  sets: TrainingSet[]
  notes?: string | null
}

export type TrainingDay = {
  date: string
  source: "hevy" | "manual"
  status: TrainingStatus
  workoutId?: string
  workoutName?: string
  duration?: number
  exerciseCount?: number
  volumeScore?: number
  totalSets?: number
  notes?: string | null
  exercises?: TrainingExercise[]
  startedAt?: string
  endedAt?: string
}

export type TrainingTodayState = "pending" | "completed" | "moved" | "rest"

export type TrainingDataMeta = {
  lastSyncAt: string | null
  sourceLabel: string
  fetchedWorkouts: number
}
