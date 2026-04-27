import { dailyKcalTargetsFromTrainingSchedule, mondayYmdOfWeekContaining, weekYmdForMealDayLabel } from "@/lib/training/mealTrainingKcal"
import type { TrainingDay } from "@/src/modules/training/types"

describe("mealTrainingKcal", () => {
  test("lunes de semana ISO para 2026-04-27 (lunes)", () => {
    expect(mondayYmdOfWeekContaining("2026-04-27")).toBe("2026-04-27")
  })

  test("weekYmdForMealDayLabel Mar es +1 desde lunes", () => {
    expect(weekYmdForMealDayLabel("2026-04-27", "Mar")).toBe("2026-04-28")
  })

  test("dailyKcalTargets sube en días trained y conserva media ~ base", () => {
    const days: TrainingDay[] = [
      { date: "2026-04-27", source: "hevy", status: "trained" },
      { date: "2026-04-29", source: "hevy", status: "trained" },
    ]
    const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
    const t = dailyKcalTargetsFromTrainingSchedule({
      mealDayLabels: labels,
      baseKcalAvg: 2200,
      trainingDays: days,
      anchorYmd: "2026-04-27",
    })
    expect(t.length).toBe(7)
    const avg = Math.round(t.reduce((s, x) => s + x, 0) / 7)
    expect(Math.abs(avg - 2200)).toBeLessThanOrEqual(3)
    expect(t[0]).toBeGreaterThan(t[1])
  })
})
