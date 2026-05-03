import type { HabitMetadata, HabitSuccessMetricType, HabitTypeId, OperationalDomain } from "@/lib/operational/types"

const DOMAIN_VALUES: OperationalDomain[] = ["salud", "fisico", "profesional", "agenda"]
const HABIT_TYPE_VALUES: HabitTypeId[] = ["standard", "water-tracking"]

const SUCCESS_METRIC_TYPES: HabitSuccessMetricType[] = ["duracion", "repeticiones", "cantidad", "si_no"]

function isSuccessMetricType(value: unknown): value is HabitSuccessMetricType {
  return typeof value === "string" && SUCCESS_METRIC_TYPES.includes(value as HabitSuccessMetricType)
}

function isDomain(value: unknown): value is OperationalDomain {
  return typeof value === "string" && DOMAIN_VALUES.includes(value as OperationalDomain)
}

function isHabitTypeId(value: unknown): value is HabitTypeId {
  return typeof value === "string" && HABIT_TYPE_VALUES.includes(value as HabitTypeId)
}

function coerceHabitMetadataPayload(raw: unknown): HabitMetadata {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  const o = raw as Record<string, unknown>
  const out: HabitMetadata = {}
  if (isHabitTypeId(o.habit_type)) {
    out.habit_type = o.habit_type
  }
  if (typeof o.water_bottle_ml === "number" && Number.isFinite(o.water_bottle_ml)) {
    const n = Math.round(o.water_bottle_ml)
    if (n >= 100 && n <= 5000) out.water_bottle_ml = n
  }
  if (typeof o.water_goal_ml === "number" && Number.isFinite(o.water_goal_ml)) {
    const n = Math.round(o.water_goal_ml)
    if (n >= 500 && n <= 8000) out.water_goal_ml = n
  }
  if (typeof o.water_glass_ml === "number" && Number.isFinite(o.water_glass_ml)) {
    const n = Math.round(o.water_glass_ml)
    if (n >= 50 && n <= 1000) out.water_glass_ml = n
  }
  if (typeof o.body_weight_kg === "number" && Number.isFinite(o.body_weight_kg)) {
    const n = o.body_weight_kg
    if (n >= 30 && n <= 250) out.body_weight_kg = Math.round(n * 10) / 10
  }
  if (o.frequency === "diario" || o.frequency === "semanal") {
    out.frequency = o.frequency
  }
  if (Array.isArray(o.weekdays)) {
    out.weekdays = o.weekdays.filter(
      (x): x is number => typeof x === "number" && x >= 0 && x <= 6
    )
  }
  if (typeof o.is_superhabit === "boolean") {
    out.is_superhabit = o.is_superhabit
  }
  if (Array.isArray(o.display_days)) {
    out.display_days = o.display_days.filter((x): x is string => typeof x === "string")
  }
  if (typeof o.intention === "string") {
    out.intention = o.intention.trim().slice(0, 500)
  }
  if (isSuccessMetricType(o.success_metric_type)) {
    out.success_metric_type = o.success_metric_type
  }
  if (typeof o.success_metric_target === "string") {
    out.success_metric_target = o.success_metric_target.trim().slice(0, 120)
  }
  if (typeof o.estimated_session_minutes === "number" && Number.isFinite(o.estimated_session_minutes)) {
    const n = Math.round(o.estimated_session_minutes)
    if (n >= 0 && n <= 24 * 60) out.estimated_session_minutes = n
  }
  if (typeof o.trigger_or_time === "string") {
    out.trigger_or_time = o.trigger_or_time.trim().slice(0, 120)
  }
  if (typeof o.intraday_si_no_progress === "boolean") {
    out.intraday_si_no_progress = o.intraday_si_no_progress
  }
  if (typeof o.intraday_si_no_target_checks === "number" && Number.isFinite(o.intraday_si_no_target_checks)) {
    const n = Math.round(o.intraday_si_no_target_checks)
    if (n >= 1 && n <= 24) out.intraday_si_no_target_checks = n
  }
  return out
}

export function parseTaskCreate(payload: unknown) {
  const body = payload as Record<string, unknown>
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const completed = typeof body?.completed === "boolean" ? body.completed : false
  const domain = isDomain(body?.domain) ? body.domain : null

  if (!title || !domain) {
    return { error: "title and domain are required" } as const
  }

  return { title, completed, domain } as const
}

export function parseTaskPatch(payload: unknown) {
  const body = payload as Record<string, unknown>
  const id = typeof body?.id === "string" ? body.id.trim() : ""
  if (!id) return { error: "id is required" } as const

  const patch: Record<string, unknown> = {}
  if (typeof body?.title === "string") patch.title = body.title.trim()
  if (typeof body?.completed === "boolean") patch.completed = body.completed
  if (isDomain(body?.domain)) patch.domain = body.domain

  if (Object.keys(patch).length === 0) {
    return { error: "no changes provided" } as const
  }

  return { id, patch } as const
}

export function parseHabitCreate(payload: unknown) {
  const body = payload as Record<string, unknown>
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const completed = typeof body?.completed === "boolean" ? body.completed : false
  const domain = isDomain(body?.domain) ? body.domain : null

  if (!name || !domain) {
    return { error: "name and domain are required" } as const
  }

  const metadata = coerceHabitMetadataPayload(body.metadata)

  return { name, completed, domain, metadata } as const
}

export function parseHabitPatch(payload: unknown) {
  const body = payload as Record<string, unknown>
  const id = typeof body?.id === "string" ? body.id.trim() : ""
  if (!id) return { error: "id is required" } as const

  const patch: Record<string, unknown> = {}
  if (typeof body?.name === "string") patch.name = body.name.trim()
  if (typeof body?.completed === "boolean") patch.completed = body.completed
  if (isDomain(body?.domain)) patch.domain = body.domain
  if (body && "metadata" in body) {
    patch.metadata = coerceHabitMetadataPayload(body.metadata)
  }

  if (Object.keys(patch).length === 0) {
    return { error: "no changes provided" } as const
  }

  return { id, patch } as const
}

export function parseCheckinCreate(payload: unknown) {
  const body = payload as Record<string, unknown>

  const score_global = typeof body?.score_global === "number" ? body.score_global : null
  const score_fisico = typeof body?.score_fisico === "number" ? body.score_fisico : null
  const score_salud = typeof body?.score_salud === "number" ? body.score_salud : null
  const score_profesional = typeof body?.score_profesional === "number" ? body.score_profesional : null

  if (
    score_global === null &&
    score_fisico === null &&
    score_salud === null &&
    score_profesional === null
  ) {
    return { error: "at least one score is required" } as const
  }

  return {
    score_global,
    score_fisico,
    score_salud,
    score_profesional,
  } as const
}


