import type { TrainingDay } from "@/src/modules/training/types"

type HevyExercise = {
  sets?: unknown[]
}

type HevyWorkout = {
  start_time?: string
  created_at?: string
  duration?: number
  exercises?: HevyExercise[]
  name?: string
  title?: string
}

function toDateOnly(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return new Date().toISOString().slice(0, 10)
  return new Date(parsed).toISOString().slice(0, 10)
}

export function normalizeHevyWorkout(workoutInput: unknown): TrainingDay {
  const workout = (workoutInput && typeof workoutInput === "object" ? workoutInput : {}) as HevyWorkout
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : []
  const exerciseCount = exercises.length
  const totalSets = exercises.reduce((total, exercise) => {
    const sets = Array.isArray(exercise.sets) ? exercise.sets.length : 0
    return total + sets
  }, 0)

  return {
    date: toDateOnly(workout.start_time ?? workout.created_at),
    source: "hevy",
    status: "trained",
    workoutName: workout.name ?? workout.title,
    duration: typeof workout.duration === "number" ? workout.duration : undefined,
    exerciseCount,
    totalSets,
    volumeScore: totalSets * 10,
  }
}
