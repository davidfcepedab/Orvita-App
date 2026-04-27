import type {
  OperationalContextData,
  OperationalDomain,
  OperationalTask,
} from "@/lib/operational/types"

const DOMAIN_PRIORITY: OperationalDomain[] = ["profesional", "agenda", "salud", "fisico"]

export type PressureBand = "bajo" | "moderado" | "alto"

export function domainAccentVar(domain: OperationalDomain): string {
  switch (domain) {
    case "agenda":
      return "var(--color-accent-agenda)"
    case "profesional":
      return "var(--color-accent-warning)"
    case "salud":
    case "fisico":
      return "var(--color-accent-health)"
    default:
      return "var(--color-accent-primary)"
  }
}

export function domainShortLabel(domain: OperationalDomain): string {
  switch (domain) {
    case "agenda":
      return "Agenda"
    case "profesional":
      return "Profesional"
    case "salud":
      return "Salud"
    case "fisico":
      return "Cuerpo"
    default:
      return "Operativo"
  }
}

export function sortTasksByDomainPriority(tasks: OperationalTask[]): OperationalTask[] {
  return [...tasks].sort(
    (a, b) => DOMAIN_PRIORITY.indexOf(a.domain) - DOMAIN_PRIORITY.indexOf(b.domain),
  )
}

export type PrimaryCommand = {
  title: string
  subtitle?: string
  domain?: OperationalDomain
  taskId?: string
  timeHint?: string
  source: "api" | "task" | "insight" | "fallback"
}

/**
 * En producción, `next_action` solo existe en mock; priorizamos tareas abiertas por dominio.
 */
export function derivePrimaryCommand(data: OperationalContextData | null): PrimaryCommand {
  const next = data?.next_action?.trim()
  if (next) {
    return {
      title: next,
      subtitle: data?.next_impact?.trim() || undefined,
      timeHint: data?.next_time_required?.trim() || undefined,
      source: "api",
    }
  }

  const open = sortTasksByDomainPriority((data?.today_tasks ?? []).filter((t) => !t.completed))
  const pick = open[0]
  if (pick) {
    return {
      title: pick.title,
      subtitle: domainShortLabel(pick.domain),
      domain: pick.domain,
      taskId: pick.id,
      timeHint: "Bloque sugerido · 45–90 min",
      source: "task",
    }
  }

  const insight = data?.insights?.[0]?.trim()
  if (insight) {
    return { title: insight, source: "insight" }
  }

  return {
    title: "Elige un solo movimiento ejecutable antes del mediodía.",
    subtitle: "La órbita se ordena con una decisión a la vez — no con más tareas en la lista.",
    source: "fallback",
  }
}

/**
 * Aplica el foco operativo en el payload de contexto (misma lógica en servidor y contrato API).
 * Si `ctx` ya trae `next_action` (p. ej. override en mock), `derivePrimaryCommand` lo respeta.
 */
export function applyDerivedCommandFocusToContext(ctx: OperationalContextData): OperationalContextData {
  const cmd = derivePrimaryCommand(ctx)
  return {
    ...ctx,
    next_action: cmd.title,
    next_impact: cmd.subtitle,
    next_time_required: cmd.timeHint,
    current_block: cmd.domain ? domainShortLabel(cmd.domain) : undefined,
    next_task_id: cmd.taskId,
    command_focus_domain: cmd.domain,
  }
}

export function totalMeetingMinutes(
  meetings: { startAt: string | null; endAt: string | null }[],
): number {
  let sum = 0
  for (const m of meetings) {
    if (!m.startAt) continue
    const t0 = Date.parse(m.startAt)
    const t1 = m.endAt ? Date.parse(m.endAt) : t0 + 60 * 60 * 1000
    if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
      sum += (t1 - t0) / 60000
    }
  }
  return Math.round(sum)
}

/** Presión de agenda: más minutos en reuniones = más carga de tiempo. */
export function timePressureFromMeetings(meetingMinutes: number): {
  band: PressureBand
  fillPct: number
  hint: string
} {
  const fillPct = Math.min(100, Math.round((meetingMinutes / 300) * 100))
  const band: PressureBand =
    fillPct < 30 ? "bajo" : fillPct < 65 ? "moderado" : "alto"
  const hint =
    band === "bajo"
      ? "Espacio para trabajo profundo."
      : band === "moderado"
        ? "Día fragmentado; protege bloques."
        : "Día denso; recorta lo negociable."
  return { band, fillPct: Math.max(8, fillPct), hint }
}

/**
 * `score_global` 0 suele indicar ausencia de check-in reciente (ver buildOperationalContext).
 * Mayor score = más capacidad percibida = menos presión energética.
 */
export function energyPressureFromCheckin(scoreGlobal: number): {
  band: PressureBand
  fillPct: number
  hint: string
  unknown: boolean
} {
  if (!Number.isFinite(scoreGlobal) || scoreGlobal <= 0) {
    return {
      band: "moderado",
      fillPct: 42,
      hint: "Sin check-in reciente: calibra energía en 60s.",
      unknown: true,
    }
  }
  const clamped = Math.min(5, Math.max(1, scoreGlobal))
  const strain = (5 - clamped) / 4
  const fillPct = Math.round(20 + strain * 80)
  const band: PressureBand =
    strain < 0.35 ? "bajo" : strain < 0.7 ? "moderado" : "alto"
  const hint =
    band === "bajo"
      ? "Capacidad alineada: puedes empujar foco."
      : band === "moderado"
        ? "Ritmo sostenible; evita sobrecarga emocional."
        : "Prioriza recuperación micro y corta el alcance."
  return { band, fillPct, hint, unknown: false }
}

export type EnergyPressureFromContext = ReturnType<typeof energyPressureFromCheckin>

/**
 * Presión energética del centro de mando: parte del check-in y refina con Apple (readiness / sync).
 */
export function energyPressureFromOperationalContext(data: OperationalContextData | null): EnergyPressureFromContext {
  const base = energyPressureFromCheckin(data?.score_global ?? 0)
  const apple = data?.apple_health
  if (!apple) return base

  if (apple.sync_stale) {
    return {
      ...base,
      hint: `${base.hint} Apple Health no se ha actualizado: ejecuta el atajo de iPhone para afinar la lectura.`,
    }
  }

  const readiness = apple.readiness_score
  const sg = data?.score_global ?? 0
  if (
    readiness != null &&
    readiness < 48 &&
    sg >= 62 &&
    !base.unknown &&
    base.band === "bajo"
  ) {
    return {
      band: "moderado",
      fillPct: Math.min(88, base.fillPct + 18),
      hint: "En Apple la recuperación sale baja y tu registro del día es optimista: afloja un poco el ritmo antes de apretar.",
      unknown: false,
    }
  }

  return base
}

export function moneyPressureFromMonth(
  income: number,
  expense: number,
): { band: PressureBand; fillPct: number; hint: string } {
  const safeBase = Math.max(income, expense, 1)
  const outflowRatio = expense / safeBase
  const fillPct = Math.min(100, Math.round(outflowRatio * 85))
  const band: PressureBand =
    outflowRatio < 0.55 ? "bajo" : outflowRatio < 0.82 ? "moderado" : "alto"
  const hint =
    band === "bajo"
      ? "Flujo holgado este mes (vs. ingresos registrados)."
      : band === "moderado"
        ? "Gasto activo: vigila fugas y suscripciones."
        : "Presión de caja: decide qué no paga este mes."
  return { band, fillPct: Math.max(10, fillPct), hint }
}

export function bandColor(band: PressureBand): string {
  switch (band) {
    case "bajo":
      return "var(--color-accent-health)"
    case "moderado":
      return "var(--color-accent-warning)"
    case "alto":
      return "var(--color-accent-danger)"
    default:
      return "var(--color-text-secondary)"
  }
}
