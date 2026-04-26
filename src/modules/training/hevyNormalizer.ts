import { agendaTodayYmd, formatLocalDateKey } from "@/lib/agenda/localDateKey"
import type { TrainingDay, TrainingExercise, TrainingSet } from "@/src/modules/training/types"

type HevyExercise = {
  id?: string
  title?: string
  name?: string
  notes?: string
  exercise_template?: {
    title?: string
    primary_muscle_group?: string
  }
  sets?: unknown[]
}

type HevyWorkout = {
  id?: string
  start_time?: string
  end_time?: string
  created_at?: string
  duration?: number
  notes?: string
  exercises?: HevyExercise[]
  name?: string
  title?: string
}

type HevySet = {
  reps?: number
  weight_kg?: number
  weight_lbs?: number
  duration_seconds?: number
  distance_meters?: number
  rpe?: number
}

/** Día civil en zona de agenda (no UTC) a partir del instante del workout en Hevy. */
function toDateOnly(value?: string) {
  if (!value) return agendaTodayYmd()
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return agendaTodayYmd()
  return formatLocalDateKey(new Date(parsed))
}

export function normalizeHevyWorkout(workoutInput: unknown): TrainingDay {
  const workout = (workoutInput && typeof workoutInput === "object" ? workoutInput : {}) as HevyWorkout
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : []
  const normalizedExercises = exercises.map(normalizeExercise).filter((exercise) => exercise.sets.length > 0)
  const exerciseCount = exercises.length
  const totalSets = normalizedExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const volumeScore = normalizedExercises.reduce((sum, exercise) => sum + estimateSetVolume(exercise.sets), 0)

  return {
    workoutId: workout.id,
    date: toDateOnly(workout.start_time ?? workout.created_at),
    source: "hevy",
    status: "trained",
    workoutName: workout.name ?? workout.title,
    duration: typeof workout.duration === "number" ? workout.duration : undefined,
    exerciseCount,
    totalSets,
    volumeScore: Math.round(volumeScore > 0 ? volumeScore : totalSets * 10),
    notes: workout.notes ?? null,
    exercises: normalizedExercises,
    startedAt: workout.start_time,
    endedAt: workout.end_time,
  }
}

function normalizeExercise(exercise: HevyExercise): TrainingExercise {
  const exerciseName =
    exercise.title ??
    exercise.name ??
    exercise.exercise_template?.title ??
    "Ejercicio"
  const rawSets = Array.isArray(exercise.sets) ? exercise.sets : []
  const sets = rawSets.map(normalizeSet).filter((set) => hasAnySetSignal(set))

  return {
    id: exercise.id,
    name: exerciseName,
    muscleGroup: exercise.exercise_template?.primary_muscle_group ?? null,
    sets,
    notes: exercise.notes ?? null,
  }
}

function normalizeSet(raw: unknown): TrainingSet {
  const set = (raw && typeof raw === "object" ? raw : {}) as HevySet
  const weightKg =
    typeof set.weight_kg === "number"
      ? set.weight_kg
      : typeof set.weight_lbs === "number"
        ? Number((set.weight_lbs * 0.453592).toFixed(2))
        : undefined
  return {
    reps: typeof set.reps === "number" ? set.reps : undefined,
    weightKg,
    durationSec: typeof set.duration_seconds === "number" ? set.duration_seconds : undefined,
    distanceM: typeof set.distance_meters === "number" ? set.distance_meters : undefined,
    rpe: typeof set.rpe === "number" ? set.rpe : undefined,
  }
}

function hasAnySetSignal(set: TrainingSet): boolean {
  return Boolean(
    (typeof set.reps === "number" && set.reps > 0) ||
      (typeof set.weightKg === "number" && set.weightKg > 0) ||
      (typeof set.durationSec === "number" && set.durationSec > 0) ||
      (typeof set.distanceM === "number" && set.distanceM > 0),
  )
}

function estimateSetVolume(sets: TrainingSet[]): number {
  return sets.reduce((sum, set) => {
    if (typeof set.reps === "number" && typeof set.weightKg === "number") {
      return sum + set.reps * set.weightKg
    }
    if (typeof set.reps === "number") return sum + set.reps * 5
    if (typeof set.durationSec === "number") return sum + set.durationSec / 6
    return sum + 8
  }, 0)
}
