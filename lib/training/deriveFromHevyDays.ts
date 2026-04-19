import type { TrainingMilestoneSeed } from "@/app/data/training/visualSeeds"
import { addCalendarDaysYmd } from "@/lib/agenda/calendarMath"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import type { TrainingDay } from "@/src/modules/training/types"

export type WeekVolumePoint = {
  label: string
  iso: string
  volume: number
  intensity: number
}

const WEEKDAY_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

function weekdayLabelEs(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`)
  return WEEKDAY_ES[d.getUTCDay()] ?? "—"
}

export function buildWeeklyVolumeIntensity(days: TrainingDay[], todayIso?: string): WeekVolumePoint[] {
  const end = todayIso ?? agendaTodayYmd()
  const byDate = new Map<string, number>()
  for (const day of days) {
    const v = day.volumeScore ?? 0
    byDate.set(day.date, (byDate.get(day.date) ?? 0) + v)
  }
  const volumes: number[] = []
  for (let i = 6; i >= 0; i--) {
    volumes.push(byDate.get(addCalendarDaysYmd(end, -i)) ?? 0)
  }
  const maxVol = Math.max(1, ...volumes)
  const points: WeekVolumePoint[] = []
  for (let i = 6; i >= 0; i--) {
    const iso = addCalendarDaysYmd(end, -i)
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

export type StrainRecoveryEstimate = {
  /** Heurística 0–95 a partir del volumen Hevy; null si no hay señal. */
  strain: number | null
  /** Derivada del strain cuando hay señal; null si no hay volumen reciente. */
  recoveryPct: number | null
  hasSignal: boolean
}

export function deriveStrainRecovery(todayVolume: number, last7Sum: number): StrainRecoveryEstimate {
  const hasSignal = todayVolume > 0 || last7Sum > 0
  if (!hasSignal) {
    return { strain: null, recoveryPct: null, hasSignal: false }
  }
  const strain = Math.min(95, Math.round(todayVolume / 5 + last7Sum / 1200))
  const recoveryPct = Math.max(38, Math.min(97, 100 - Math.round(strain * 0.65)))
  return { strain, recoveryPct, hasSignal: true }
}

export type MilestoneView = {
  id: number
  title: string
  progressLabel: string
  barPct: number
  subtitle: string
}

export function buildMilestoneViews(days: TrainingDay[], seeds: TrainingMilestoneSeed[]): MilestoneView[] {
  const cutoff = addCalendarDaysYmd(agendaTodayYmd(), -14)
  const recent = days.filter((d) => d.date >= cutoff && d.source === "hevy")

  return seeds.map((seed) => {
    if (seed.unit === "kg") {
      const n = countWorkoutNameMatches(recent, /dead|peso muerto|rumo|rdl|sumo/i)
      const pct = n > 0 ? Math.min(100, Math.round((n / 6) * 100)) : 0
      return {
        id: seed.id,
        title: seed.title.replace(/Deadlift/i, "Peso muerto"),
        progressLabel:
          n > 0
            ? `Hevy (14 días): ${n} sesión(es) con patrón de fuerza · referencia ${seed.target} ${seed.unit}`
            : `Referencia ${seed.target} ${seed.unit} — sin sesiones Hevy con patrón de peso muerto (14 días)`,
        barPct: pct,
        subtitle:
          n > 0
            ? "La barra refleja consistencia de sesiones con nombre/ejercicios tipo peso muerto; no sustituye el registro de cargas en Hevy."
            : "Registra entrenos en Hevy cuyo nombre o bloque sugiera peso muerto/RDL para seguir este hito.",
      }
    }
    if (seed.unit === "min" && seed.reverse) {
      const n = countWorkoutNameMatches(recent, /run|carrera|5k|5 k|rodaje|interval|tempo/i)
      const pct = n > 0 ? Math.min(100, Math.round((n / 4) * 100)) : 0
      return {
        id: seed.id,
        title: seed.title.replace(/5 km Run/i, "Carrera 5 km"),
        progressLabel:
          n > 0
            ? `Hevy (14 días): ${n} sesión(es) tipo carrera/rodaje · objetivo tiempo ~${seed.target} min`
            : `Objetivo ~${seed.target} min (5K) — sin carreras/rodajes detectados en Hevy (14 días)`,
        barPct: pct,
        subtitle:
          n > 0
            ? "La barra refleja frecuencia de sesiones con patrón carrera/intervalo; el tiempo de carrera no se infiere aún desde la API."
            : "Añade entrenos con nombre tipo carrera, 5K o rodaje en Hevy para seguir este hito.",
      }
    }
    const pct = Math.min(100, Math.round((seed.current / seed.target) * 100))
    return {
      id: seed.id,
      title: seed.title,
      progressLabel: `Configuración: ${seed.current} / ${seed.target} ${seed.unit}`,
      barPct: pct,
      subtitle: "Define objetivos en preferencias o enriquece Hevy para sustituir esta referencia.",
    }
  })
}

function countWorkoutNameMatches(days: TrainingDay[], re: RegExp): number {
  return days.filter((d) => d.source === "hevy" && re.test((d.workoutName ?? "").toLowerCase())).length
}
