import type { TrainingDay } from "@/src/modules/training/types"

/** Últimos 7 días calendario: mezcla descansos y sesiones con nombres útiles para hitos heurísticos. */
export function buildMockTrainingDays(reference = new Date()): TrainingDay[] {
  const templates: { sets: number; name: string }[] = [
    { sets: 14, name: "Push fuerza" },
    { sets: 0, name: "" },
    { sets: 16, name: "Pull — Deadlift" },
    { sets: 12, name: "Carrera 5K técnico" },
    { sets: 0, name: "" },
    { sets: 18, name: "Lower hypertrophy" },
    { sets: 11, name: "Natación técnica" },
  ]

  const out: TrainingDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(reference)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const t = templates[6 - i]
    if (!t || t.sets === 0) continue
    out.push({
      date: iso,
      source: "hevy",
      status: "trained",
      workoutName: t.name,
      duration: 36 + t.sets * 2,
      exerciseCount: Math.max(4, Math.round(t.sets / 2.5)),
      totalSets: t.sets,
      volumeScore: t.sets * 10,
    })
  }
  return out
}
