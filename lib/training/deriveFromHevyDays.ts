import type { TrainingMilestoneSeed } from "@/app/data/training/visualSeeds"
import type { TrainingDay } from "@/src/modules/training/types"

export type WeekVolumePoint = {
  label: string
  iso: string
  volume: number
  intensity: number
}

function addDaysIso(isoBase: string, deltaDays: number): string {
  const d = new Date(`${isoBase}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

const WEEKDAY_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

function weekdayLabelEs(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`)
  return WEEKDAY_ES[d.getUTCDay()] ?? "—"
}

export function buildWeeklyVolumeIntensity(days: TrainingDay[], todayIso?: string): WeekVolumePoint[] {
  const end = todayIso ?? new Date().toISOString().slice(0, 10)
  const byDate = new Map<string, number>()
  for (const day of days) {
    const v = day.volumeScore ?? 0
    byDate.set(day.date, (byDate.get(day.date) ?? 0) + v)
  }
  const volumes: number[] = []
  for (let i = 6; i >= 0; i--) {
    volumes.push(byDate.get(addDaysIso(end, -i)) ?? 0)
  }
  const maxVol = Math.max(1, ...volumes)
  const points: WeekVolumePoint[] = []
  for (let i = 6; i >= 0; i--) {
    const iso = addDaysIso(end, -i)
    const volume = byDate.get(iso) ?? 0
    points.push({
      label: weekdayLabelEs(iso),
      iso,
      volume,
      intensity: Math.min(100, Math.round((volume / maxVol) * 100)),
    })
  }
  return points
}

export function weeklyVolumeSum(points: WeekVolumePoint[]): number {
  return points.reduce((s, p) => s + p.volume, 0)
}

export function deriveStrainRecovery(todayVolume: number, last7Sum: number): { strain: number; recoveryPct: number } {
  const strain = Math.min(95, Math.round(todayVolume / 5 + last7Sum / 1200))
  const recoveryPct = Math.max(38, Math.min(97, 100 - Math.round(strain * 0.65)))
  return { strain, recoveryPct }
}

export type MilestoneView = {
  id: number
  title: string
  progressLabel: string
  barPct: number
  subtitle: string
}

export function buildMilestoneViews(days: TrainingDay[], seeds: TrainingMilestoneSeed[]): MilestoneView[] {
  const cutoff = addDaysIso(new Date().toISOString().slice(0, 10), -14)
  const recent = days.filter((d) => d.date >= cutoff && d.source === "hevy")

  return seeds.map((seed) => {
    if (seed.unit === "kg") {
      const n = countWorkoutNameMatches(recent, /dead|peso muerto|rumo|rdl|sumo/i)
      const bump = Math.min(seed.target - seed.current, n * 2.5)
      const current = Math.min(seed.target, Math.round((seed.current + bump) * 10) / 10)
      const pct = Math.min(100, Math.round((current / seed.target) * 100))
      return {
        id: seed.id,
        title: seed.title.replace(/Deadlift/i, "Peso muerto"),
        progressLabel: `Actual: ${current} / ${seed.target} ${seed.unit.toUpperCase()}`,
        barPct: pct,
        subtitle: n > 0 ? `Basado en ${n} sesión(es) recientes en Hevy con foco fuerza.` : "Sin sesiones detectadas con patrón de peso muerto en Hevy (últimas 2 semanas).",
      }
    }
    if (seed.unit === "min" && seed.reverse) {
      const n = countWorkoutNameMatches(recent, /run|carrera|5k|5 k|rodaje|interval|tempo/i)
      const improved = Math.min(3, n * 0.35)
      const current = Math.max(seed.target, Math.round((seed.current - improved) * 10) / 10)
      const span = 12
      const done = Math.min(100, Math.round(((span - (current - seed.target)) / span) * 100))
      return {
        id: seed.id,
        title: seed.title.replace(/5 km Run/i, "Carrera 5 km"),
        progressLabel: `Actual: ${current} / ${seed.target} min (objetivo más rápido)`,
        barPct: Math.max(8, Math.min(100, done)),
        subtitle: n > 0 ? `${n} carrera(s) o rodajes registrados en Hevy recientemente.` : "Añade entrenos con nombre tipo carrera/5K en Hevy para afinar este hito.",
      }
    }
    const pct = Math.min(100, Math.round((seed.current / seed.target) * 100))
    return {
      id: seed.id,
      title: seed.title,
      progressLabel: `Actual: ${seed.current} / ${seed.target} ${seed.unit}`,
      barPct: pct,
      subtitle: "Progreso base (semilla); conecta más datos en Hevy para refinar.",
    }
  })
}

function countWorkoutNameMatches(days: TrainingDay[], re: RegExp): number {
  return days.filter((d) => d.source === "hevy" && re.test((d.workoutName ?? "").toLowerCase())).length
}
