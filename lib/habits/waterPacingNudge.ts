import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { formatWaterMlEs } from "@/lib/habits/waterTrackingHelpers"

export type WaterPacingNudge = {
  tone: "warn" | "urgent"
  title: string
  body: string
}

/** Hora y minuto actuales en la zona de agenda (0–23, 0–59). */
function clockInAgendaTz(now: Date): { hour: number; minute: number } {
  const tz = getAgendaDisplayTimeZone()
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 }
}

/** Fracción del día civil transcurrida en la zona de agenda [0,1). */
function fractionOfAgendaDayElapsed(now: Date): number {
  const { hour, minute } = clockInAgendaTz(now)
  return Math.min(0.999, Math.max(0, (hour + minute / 60) / 24))
}

/** Horas aproximadas hasta medianoche civil en la zona de agenda. */
function hoursLeftInAgendaCivilDay(now: Date): number {
  const { hour, minute } = clockInAgendaTz(now)
  const elapsed = hour + minute / 60
  return Math.max(0.25, 24 - elapsed)
}

/**
 * Mensaje de ritmo para la misión de agua: compara avance real vs ritmo lineal del día
 * y refuerza si queda poco tiempo y aún falta mucha meta.
 */
export function buildWaterPacingNudge(todayMl: number, goalMl: number): WaterPacingNudge | null {
  if (!Number.isFinite(goalMl) || goalMl <= 0) return null
  if (todayMl >= goalMl) return null

  const now = new Date()
  const frac = fractionOfAgendaDayElapsed(now)
  const linearPace = goalMl * frac
  const behind = linearPace > 0 && todayMl < linearPace * 0.85
  const remaining = goalMl - todayMl
  const hoursLeft = hoursLeftInAgendaCivilDay(now)
  const mlPerHourNeeded = remaining / hoursLeft
  const { hour } = clockInAgendaTz(now)

  if (hour >= 21 && remaining > 200) {
    return {
      tone: "urgent",
      title: "Último tramo del día",
      body: `Aún faltan unos ${formatWaterMlEs(remaining)} ml para la meta. Cada botellita cuenta: repartí lo que puedas antes de cerrar el día.`,
    }
  }

  if ((hour >= 18 && behind) || mlPerHourNeeded > 600) {
    return {
      tone: "warn",
      title: "Ritmo por debajo de la meta",
      body: `Llevas ${formatWaterMlEs(todayMl)} ml de ${formatWaterMlEs(goalMl)} ml. Te faltan unos ${formatWaterMlEs(remaining)} ml y el día se acorta: sumá una botellita o un vaso extra.`,
    }
  }

  if (behind && frac > 0.35) {
    return {
      tone: "warn",
      title: "Un poco rezagado respecto al ritmo sugerido",
      body: `A esta altura del día conviene ir por al menos ${formatWaterMlEs(Math.round(linearPace * 0.9))} ml; vas en ${formatWaterMlEs(todayMl)} ml.`,
    }
  }

  return null
}
