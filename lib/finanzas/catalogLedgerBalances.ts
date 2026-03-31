/**
 * Priorización de montos desde catálogo (Supabase), alineada con tarjetas de crédito:
 * - Ahorro: sin fecha de anclaje, gana `balance_available` (saldo banco) sobre `manual_balance` positivo.
 * - Crédito estructural: saldo pendiente en `balance_used`; si falta, `manual_balance` o `balance_available`
 *   (misma confusión de columnas que en TC cuando el extracto va en “disponible”).
 */

export function ahorroSaldoOperativoFromCatalog(a: {
  manual_balance?: number | null
  manual_balance_on?: string | null
  balance_available?: number | null
}): number | null {
  const manualRaw = a.manual_balance != null ? Number(a.manual_balance) : NaN
  const availRaw = a.balance_available != null ? Number(a.balance_available) : NaN
  const manualLocked = Boolean(a.manual_balance_on?.trim())

  if (manualLocked && Number.isFinite(manualRaw)) {
    return Math.max(0, Math.round(manualRaw))
  }
  if (Number.isFinite(availRaw) && availRaw >= 0) {
    return Math.round(Math.max(0, availRaw))
  }
  if (Number.isFinite(manualRaw) && manualRaw > 0) {
    return Math.round(Math.max(0, manualRaw))
  }
  return null
}

export function creditoSaldoPendienteFromCatalog(a: {
  balance_used?: number | null
  manual_balance?: number | null
  balance_available?: number | null
}): number | null {
  const used = Math.round(Math.max(0, Number(a.balance_used ?? 0)))
  if (used >= 1) return used

  const manual = Math.round(Math.max(0, Number(a.manual_balance ?? 0)))
  if (manual >= 1) return manual

  const availRaw = a.balance_available != null ? Number(a.balance_available) : NaN
  if (Number.isFinite(availRaw) && availRaw >= 1) {
    return Math.round(availRaw)
  }

  return null
}
