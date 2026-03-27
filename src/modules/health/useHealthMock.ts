import { useMemo } from "react"

export type HealthMock = {
  sleepHours: number
  sleepQuality: number
  anxietyLevel: number
  trainedToday: boolean
  hydrationLiters: number
  meditationMinutes: number
  readingMinutes: number
  partnerTimeMinutes: number
  connectionQuality: number
  socialInteractions: number
}

export function useHealthMock(): HealthMock {
  return useMemo(
    () => ({
      sleepHours: 7.2,
      sleepQuality: 4,
      anxietyLevel: 2,
      trainedToday: true,
      hydrationLiters: 2.4,
      meditationMinutes: 18,
      readingMinutes: 25,
      partnerTimeMinutes: 75,
      connectionQuality: 4,
      socialInteractions: 3,
    }),
    []
  )
}
