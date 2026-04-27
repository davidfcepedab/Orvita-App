import type { TrainingDay, TrainingSet } from "@/src/modules/training/types"
import type { MuscleId } from "@/lib/training/muscleMapping"
import { resolveExerciseMapping } from "@/lib/training/muscleMapping"

export type ZoneStatus = "rezagado" | "en desarrollo" | "bien" | "sobrecarga"
export type ZoneKey = "chest" | "arms" | "back" | "legs" | "abs"

export type ZoneProgress = {
  key: ZoneKey
  label: string
  actualSets: number
  targetSets: number
  progress: number
  ratio: number
  status: ZoneStatus
}

const ZONE_META: Record<ZoneKey, { label: string; targetSets: number }> = {
  chest: { label: "Pecho", targetSets: 14 },
  arms: { label: "Brazos", targetSets: 15 },
  back: { label: "Espalda", targetSets: 16 },
  legs: { label: "Piernas", targetSets: 15 },
  abs: { label: "Abdomen", targetSets: 10 },
}

export function intensityFactor(set: TrainingSet): number {
  const reps = set.reps ?? null
  const weight = set.weightKg ?? null
  const duration = set.durationSec ?? null
  if ((typeof reps === "number" && reps <= 6) || (typeof weight === "number" && weight >= 40)) return 1.2
  if ((typeof reps === "number" && reps >= 15) || (typeof duration === "number" && duration > 90)) return 0.8
  return 1
}

export function rirFactor(set: TrainingSet): number {
  if (typeof set.rpe !== "number") return 1
  const rir = Math.max(0, 10 - set.rpe)
  if (rir <= 1) return 1.2
  if (rir <= 3) return 1
  if (rir > 4) return 0.7
  return 0.85
}

export function effectiveSetValue(set: TrainingSet): number {
  return 1 * intensityFactor(set) * rirFactor(set)
}

export function statusFromRatio(ratio: number): ZoneStatus {
  if (ratio > 1.1) return "sobrecarga"
  if (ratio >= 0.85) return "bien"
  if (ratio >= 0.6) return "en desarrollo"
  return "rezagado"
}

function muscleToZoneWeights(primary: MuscleId, secondary: MuscleId[]) {
  const out: Partial<Record<ZoneKey, number>> = {}
  const add = (zone: ZoneKey, weight: number) => {
    out[zone] = (out[zone] ?? 0) + weight
  }
  const primaryZone = muscleToZone(primary)
  if (primaryZone) add(primaryZone, 1)
  for (const sec of secondary) {
    const secondaryZone = muscleToZone(sec)
    if (secondaryZone) add(secondaryZone, 0.5)
  }
  return out
}

function muscleToZone(muscle: MuscleId): ZoneKey | null {
  if (muscle === "chest") return "chest"
  if (muscle === "back") return "back"
  if (muscle === "legs" || muscle === "glutes") return "legs"
  if (muscle === "arms" || muscle === "biceps" || muscle === "triceps" || muscle === "shoulders") return "arms"
  if (muscle === "abs") return "abs"
  return null
}

export function aggregateZoneProgress(days: TrainingDay[]): ZoneProgress[] {
  const totals: Record<ZoneKey, number> = {
    chest: 0,
    arms: 0,
    back: 0,
    legs: 0,
    abs: 0,
  }

  for (const day of days) {
    for (const exercise of day.exercises ?? []) {
      const mapping = resolveExerciseMapping(exercise.name, exercise.muscleGroup)
      if (!mapping) continue
      const zoneWeights = muscleToZoneWeights(mapping.primary, mapping.secondary)
      for (const set of exercise.sets) {
        const value = effectiveSetValue(set)
        for (const [zone, weight] of Object.entries(zoneWeights)) {
          totals[zone as ZoneKey] += value * (weight ?? 0)
        }
      }
    }
  }

  return (Object.keys(ZONE_META) as ZoneKey[]).map((zone) => {
    const targetSets = ZONE_META[zone].targetSets
    const actualSets = Number(totals[zone].toFixed(1))
    const ratio = targetSets > 0 ? actualSets / targetSets : 0
    return {
      key: zone,
      label: ZONE_META[zone].label,
      actualSets,
      targetSets,
      ratio,
      progress: Math.max(10, Math.min(130, Math.round(ratio * 100))),
      status: statusFromRatio(ratio),
    }
  })
}
