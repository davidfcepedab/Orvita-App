export type TrainingStatus = "trained" | "rest" | "skip" | "swim"

export type TrainingDay = {
  date: string
  source: "hevy" | "manual"
  status: TrainingStatus
  workoutName?: string
  duration?: number
  exerciseCount?: number
  volumeScore?: number
  totalSets?: number
}
