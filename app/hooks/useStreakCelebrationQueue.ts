"use client"

import { useCallback, useState } from "react"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"

/**
 * Cola de overlays de hito de racha (superhábito). Dedupe por pestaña vía sessionStorage.
 */
export function useStreakCelebrationQueue() {
  const [streakQueue, setStreakQueue] = useState<StreakCelebrationPayload[]>([])

  const enqueueStreakCelebrations = useCallback((hits: StreakCelebrationPayload[]) => {
    if (hits.length === 0) return
    const allowed: StreakCelebrationPayload[] = []
    for (const hit of hits) {
      try {
        const k = `orbita:habit-streak-toast:${hit.habitId}:${hit.milestoneDays}`
        if (sessionStorage.getItem(k)) continue
        sessionStorage.setItem(k, "1")
      } catch {
        /* private mode */
      }
      allowed.push(hit)
    }
    if (allowed.length) setStreakQueue((q) => [...q, ...allowed])
  }, [])

  const dismissFront = useCallback(() => setStreakQueue((q) => q.slice(1)), [])

  return {
    streakQueue,
    activeStreak: streakQueue[0] ?? null,
    streakOpen: streakQueue.length > 0,
    enqueueStreakCelebrations,
    dismissFront,
  }
}
