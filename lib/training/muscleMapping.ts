export type MuscleId = "chest" | "back" | "legs" | "glutes" | "arms" | "biceps" | "triceps" | "shoulders" | "abs"

export type ExerciseMuscleMapping = {
  id: string
  pattern: RegExp
  aliases: string[]
  primary: MuscleId
  secondary: MuscleId[]
}

const EXERCISE_MUSCLE_MAP: ExerciseMuscleMapping[] = [
  {
    id: "bench-press",
    pattern: /\b(bench press|press banca|barbell bench|dumbbell bench)\b/i,
    aliases: ["bench press", "press banca"],
    primary: "chest",
    secondary: ["triceps"],
  },
  {
    id: "incline-press",
    pattern: /\b(incline press|press inclinado)\b/i,
    aliases: ["incline press", "press inclinado"],
    primary: "chest",
    secondary: ["shoulders", "triceps"],
  },
  {
    id: "pull-up-lat-pulldown",
    pattern: /\b(pull up|pull-up|chin up|lat pulldown|jalon al pecho|jalón al pecho)\b/i,
    aliases: ["pull up", "lat pulldown"],
    primary: "back",
    secondary: ["biceps"],
  },
  {
    id: "row-remo",
    pattern: /\b(row|remo|seated row|barbell row|dumbbell row)\b/i,
    aliases: ["row", "remo"],
    primary: "back",
    secondary: ["biceps"],
  },
  {
    id: "squat-sentadilla",
    pattern: /\b(squat|sentadilla|front squat|back squat)\b/i,
    aliases: ["squat", "sentadilla"],
    primary: "legs",
    secondary: ["glutes"],
  },
  {
    id: "leg-press",
    pattern: /\b(leg press|prensa)\b/i,
    aliases: ["leg press", "prensa"],
    primary: "legs",
    secondary: [],
  },
  {
    id: "deadlift-peso-muerto",
    pattern: /\b(deadlift|peso muerto|romanian deadlift|rdl)\b/i,
    aliases: ["deadlift", "peso muerto"],
    primary: "back",
    secondary: ["legs"],
  },
  {
    id: "biceps-curl",
    pattern: /\b(curl|biceps curl|curl biceps|hammer curl)\b/i,
    aliases: ["biceps curl", "curl"],
    primary: "biceps",
    secondary: [],
  },
  {
    id: "triceps-extension",
    pattern: /\b(triceps extension|extensión de tríceps|tricep extension|pushdown|triceps pushdown)\b/i,
    aliases: ["triceps extension", "pushdown"],
    primary: "triceps",
    secondary: [],
  },
  {
    id: "lateral-raise",
    pattern: /\b(lateral raise|elevaciones laterales|side raise)\b/i,
    aliases: ["lateral raise", "elevaciones laterales"],
    primary: "shoulders",
    secondary: [],
  },
  {
    id: "core",
    pattern: /\b(crunch|plank|leg raise|hanging leg raise|sit up|ab wheel)\b/i,
    aliases: ["crunch", "plank", "leg raise"],
    primary: "abs",
    secondary: [],
  },
]

export function resolveExerciseMapping(exerciseName: string, muscleGroup?: string | null): ExerciseMuscleMapping | null {
  const text = `${exerciseName} ${muscleGroup ?? ""}`.trim()
  for (const mapping of EXERCISE_MUSCLE_MAP) {
    if (mapping.pattern.test(text)) return mapping
  }
  return null
}

export function getExerciseMuscleMap() {
  return EXERCISE_MUSCLE_MAP
}
