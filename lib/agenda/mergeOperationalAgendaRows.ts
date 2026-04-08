import type { OperationalDomain } from "@/lib/operational/types"

/** Fila mínima para combinar resultados de agenda (propias + recibidas aceptadas). */
export type AgendaRowLike = {
  id: string
  user_id: string | null
  created_at: string
  domain: OperationalDomain
}

/**
 * Une listas sin duplicar por `id` y ordena por `created_at` descendente.
 */
export function mergeAgendaRowsById<T extends AgendaRowLike>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>()
  for (const row of a) byId.set(row.id, row)
  for (const row of b) byId.set(row.id, row)
  return Array.from(byId.values()).sort(
    (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime(),
  )
}
