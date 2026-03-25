export type WeeklyTrainingSeed = {
  day: string
  volume: number
  intensity: number
  minutes: number
}

export type TrainingMilestoneSeed = {
  id: number
  title: string
  current: number
  target: number
  unit: string
  history: number[]
  reverse?: boolean
}

export type BodyMetricSeed = {
  label: string
  current: number
  target: number
  unit: string
  trend: "up" | "down"
}

export type MealDaySeed = {
  day: string
  cals: number
  protein: number
  carbs: number
  fats: number
}

export const TRAINING_WEEKLY_VOLUME: WeeklyTrainingSeed[] = [
  { day: "Mon", volume: 4500, intensity: 60, minutes: 62 },
  { day: "Tue", volume: 3200, intensity: 45, minutes: 44 },
  { day: "Wed", volume: 5800, intensity: 85, minutes: 74 },
  { day: "Thu", volume: 1400, intensity: 28, minutes: 22 },
  { day: "Fri", volume: 4100, intensity: 65, minutes: 56 },
  { day: "Sat", volume: 6200, intensity: 75, minutes: 81 },
  { day: "Sun", volume: 2000, intensity: 30, minutes: 30 },
]

export const TRAINING_MILESTONES: TrainingMilestoneSeed[] = [
  {
    id: 1,
    title: "Deadlift 100 kg",
    current: 85,
    target: 100,
    unit: "kg",
    history: [60, 65, 70, 75, 75, 80, 85],
  },
  {
    id: 2,
    title: "5 km Run",
    current: 24.2,
    target: 22,
    unit: "min",
    history: [30, 28, 27, 26, 25.5, 25, 24.2],
    reverse: true,
  },
]

export const TRAINING_BODY_METRICS: BodyMetricSeed[] = [
  { label: "Peso", current: 78.5, target: 75, unit: "kg", trend: "down" },
  { label: "% Grasa", current: 16.5, target: 12, unit: "%", trend: "down" },
  { label: "Pecho", current: 102, target: 108, unit: "cm", trend: "up" },
  { label: "Brazos", current: 36, target: 40, unit: "cm", trend: "up" },
  { label: "Cintura", current: 86, target: 80, unit: "cm", trend: "down" },
  { label: "Muslos", current: 58, target: 62, unit: "cm", trend: "up" },
]

export const TRAINING_MEAL_PLAN: MealDaySeed[] = [
  { day: "Lun", cals: 2150, protein: 160, carbs: 200, fats: 65 },
  { day: "Mar", cals: 2150, protein: 160, carbs: 200, fats: 65 },
  { day: "Mie", cals: 2400, protein: 160, carbs: 260, fats: 70 },
  { day: "Jue", cals: 2150, protein: 160, carbs: 200, fats: 65 },
  { day: "Vie", cals: 2150, protein: 160, carbs: 200, fats: 65 },
  { day: "Sab", cals: 2600, protein: 170, carbs: 300, fats: 80 },
  { day: "Dom", cals: 1900, protein: 160, carbs: 150, fats: 60 },
]