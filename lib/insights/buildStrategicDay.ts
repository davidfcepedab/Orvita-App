import { moneyPressureFromMonth, timePressureFromMeetings } from "@/lib/hoy/commandDerivation"
import type { AppleHealthContextSignals, OperationalContextData, OperationalDomain } from "@/lib/operational/types"

export type StrategicAccent = "health" | "agenda" | "finance" | "profesional" | "checkin"

export type StrategicPrimaryLever = {
  id: string
  label: string
  description: string
  cta: string
  href: string
  domain: OperationalDomain
  accent: StrategicAccent
}

export type StrategicDayPayload = {
  headline: string
  subhead: string
  insightLines: string[]
  primaryLever: StrategicPrimaryLever
}

function greetingEs(): string {
  const h = new Date().getHours()
  if (h < 5) return "Hola de nuevo"
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

function leverAccentForDomain(d: OperationalDomain): StrategicPrimaryLever["accent"] {
  if (d === "profesional") return "profesional"
  if (d === "agenda") return "agenda"
  if (d === "fisico" || d === "salud") return "health"
  return "agenda"
}

function sleepDebtHint(apple: AppleHealthContextSignals | null, salud: number): string | null {
  const s = apple?.sleep_hours
  if (s == null) return null
  if (s < 6) {
    return `Sueño medido bajo (~${s.toFixed(1)} h). Si el check-in de salud va en ${salud}/100, conviene asumir deuda de sueño aunque el día pida productividad.`
  }
  if (s >= 7.5) {
    return `Sueño alrededor de ${s.toFixed(1)} h: buena base para acompañar decisiones; úsala para proteger foco, no solo para exigirte más.`
  }
  return null
}

function readinessVsCheckin(apple: AppleHealthContextSignals | null, scoreSalud: number): string | null {
  const r = apple?.readiness_score
  if (r == null || scoreSalud <= 0) return null
  if (r < 50 && scoreSalud >= 65) {
    return `Tu readiness en Apple está en ${r} y al mismo tiempo el check-in de salud se siente fuerte (${scoreSalud}/100). Merece la pena ceder 60–90 min a recuperación real antes de apretar otra palanca.`
  }
  if (r >= 60 && scoreSalud < 55) {
    return `El cuerpo, según Apple, da ${r} de recuperación, aunque el check-in de salud se sienta bajo (${scoreSalud}/100). A veces es carga emocional o estrés, no pereza.`
  }
  return null
}

/**
 * Día estratégico: correlaciona `OperationalContextData` (check-in + Apple + tareas) con tiempo (agenda) y capital.
 * Copy orientativo, no clínico.
 */
export function buildStrategicDay(input: {
  ctx: OperationalContextData | null
  finance: { total_income_current: number; total_expense_current: number } | null | undefined
  meetingMinutes: number
}): StrategicDayPayload {
  const { ctx, finance, meetingMinutes } = input
  const apple = ctx?.apple_health ?? null
  const scoreG = ctx?.score_global ?? 0
  const salud = ctx?.score_salud ?? 0
  const insightLines: string[] = []

  if (ctx?.insights?.length) {
    for (const line of ctx.insights) {
      if (line.trim()) insightLines.push(line.trim())
    }
  }

  const rh = readinessVsCheckin(apple, salud)
  if (rh) insightLines.push(rh)
  const sd = sleepDebtHint(apple, salud)
  if (sd) insightLines.push(sd)

  const timeP = timePressureFromMeetings(meetingMinutes)
  if (timeP.band === "alto" && meetingMinutes > 0) {
    insightLines.push(
      `La agenda pide alrededor de ${Math.round(meetingMinutes)} min en reuniones: es presión de tiempo alta. Aísla un bloque mínimo de foco aunque sea 25 min.`,
    )
  } else if (timeP.band === "bajo" && meetingMinutes < 60) {
    insightLines.push("El calendario hoy deja aire: úsalo para una sola tarea a profundidad antes del ruido.")
  }

  if (finance && finance.total_income_current > 0) {
    const m = moneyPressureFromMonth(finance.total_income_current, finance.total_expense_current)
    if (m.band === "alto") {
      insightLines.push(
        "El flujo de capital del mes pide cuidado: hoy gana importancia qué no financiar antes de asumir más carga en lo demás.",
      )
    }
  }

  const openTasks = (ctx?.today_tasks ?? []).filter((t) => !t.completed)
  const firstByQueue = openTasks[0] ?? null
  const nextId = ctx?.next_task_id
  const taskMatchesNext = nextId && firstByQueue && firstByQueue.id === nextId

  let subhead = "Tu mapa: una lectura, una palanca. Lo demás es apoyo."
  if (scoreG > 0) {
    subhead = `Pulso global del check-in ~${Math.round((scoreG / 100) * 10)}/10. Así alineas tiempo, cuerpo y decisiones.`
  }

  const moneyP =
    finance && finance.total_income_current > 0
      ? moneyPressureFromMonth(finance.total_income_current, finance.total_expense_current)
      : null

  let primaryLever: StrategicPrimaryLever
  if (apple?.sync_stale) {
    primaryLever = {
      id: "sync-apple",
      label: "Sincronizar con el cuerpo (Apple Health)",
      description: "Sin datos recientes, Órvita adivina menos. Un import tarda segundos.",
      cta: "Ir a importar o token",
      href: "/salud",
      domain: "salud",
      accent: "health",
    }
  } else if (taskMatchesNext && firstByQueue) {
    primaryLever = {
      id: "task-priority",
      label: "Palanca nº 1: cerrar el foco operativo",
      description: `Tu cola señala «${firstByQueue.title}» como lo más urgente según el dominio.`,
      cta: "Ir al centro de mando",
      href: "/hoy",
      domain: firstByQueue.domain,
      accent: leverAccentForDomain(firstByQueue.domain),
    }
  } else if (insightLines[0] && (salud >= 60 || (apple && (apple.readiness_score ?? 100) < 50))) {
    primaryLever = {
      id: "pace-recovery",
      label: "Protege recuperación antes de exigirte más",
      description:
        "La frase de arriba conecta lo que sientes con lo que mide el cuerpo: hazla realidad con tiempo bloqueado.",
      cta: "Ver salud y ritmo",
      href: "/salud",
      domain: "salud",
      accent: "health",
    }
  } else if (moneyP?.band === "alto") {
    primaryLever = {
      id: "capital-focus",
      label: "Revisa una decisión de flujo hoy",
      description: "El mes muestra presión de caja. Un solo ajuste consciente basta para recuperar control percibido.",
      cta: "Ver resumen de capital",
      href: "/finanzas/overview",
      domain: "profesional",
      accent: "finance",
    }
  } else if (timeP.band === "alto") {
    primaryLever = {
      id: "time-agenda",
      label: "Alinear la agenda con lo que importa",
      description: "Muchas reuniones consumen ancho de banda. Elige una entrega y protégela.",
      cta: "Abrir agenda",
      href: "/agenda",
      domain: "agenda",
      accent: "agenda",
    }
  } else {
    primaryLever = {
      id: "checkin-refresh",
      label: "Actualiza tu check-in en 60 segundos",
      description: "Con lectura fresca, Órvita ajusta insights y el foco del día en todas las áreas.",
      cta: "Abrir check-in",
      href: "/checkin",
      domain: "salud",
      accent: "checkin",
    }
  }

  const uniqueInsights = Array.from(new Set(insightLines)).slice(0, 4)
  const headline = `${greetingEs()} — claridad en tu capital operativo`

  return {
    headline,
    subhead,
    insightLines: uniqueInsights,
    primaryLever,
  }
}
