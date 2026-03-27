export type RecoveryInput = {
  sleepHours: number
  sleepQuality: number
  anxietyLevel: number
  trainedToday: boolean
}

export function calculateRecovery(input: RecoveryInput) {
  const sleepScore = Math.min(input.sleepHours / 8, 1) * 40
  const qualityScore = (input.sleepQuality / 5) * 30
  const anxietyPenalty = (input.anxietyLevel / 5) * 20
  const trainingAdjustment = input.trainedToday ? -5 : 5

  const raw = sleepScore + qualityScore - anxietyPenalty + trainingAdjustment

  const score = Math.max(0, Math.min(100, raw))

  let status: "optimal" | "stable" | "fragile"

  if (score >= 75) status = "optimal"
  else if (score >= 50) status = "stable"
  else status = "fragile"

  return { score: Math.round(score), status }
}
