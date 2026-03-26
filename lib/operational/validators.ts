import type { OperationalDomain } from "@/lib/operational/types"

const DOMAIN_VALUES: OperationalDomain[] = ["salud", "fisico", "profesional"]

function isDomain(value: unknown): value is OperationalDomain {
  return typeof value === "string" && DOMAIN_VALUES.includes(value as OperationalDomain)
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

  return { name, completed, domain } as const
}

export function parseHabitPatch(payload: unknown) {
  const body = payload as Record<string, unknown>
  const id = typeof body?.id === "string" ? body.id.trim() : ""
  if (!id) return { error: "id is required" } as const

  const patch: Record<string, unknown> = {}
  if (typeof body?.name === "string") patch.name = body.name.trim()
  if (typeof body?.completed === "boolean") patch.completed = body.completed
  if (isDomain(body?.domain)) patch.domain = body.domain

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
