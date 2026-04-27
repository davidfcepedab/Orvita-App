/**
 * Scores de check-in en Órvita se tratan como 0–100 en UI.
 * Valores fuera de rango (datos viejos o error) se acotan para no romper copy.
 */
export function clampCheckinScore0to100(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Normaliza el índice compuesto narrativa (12–99) a 0–100 solo para semáforo OK/atención/desbalance. */
export function normalizedCompositeEnergyIndex(bodyBattery: number): number {
  if (!Number.isFinite(bodyBattery)) return 0
  const v = Math.min(99, Math.max(12, bodyBattery))
  return Math.round(((v - 12) / (99 - 12)) * 100)
}

/** Valor mostrado del índice compuesto (misma fórmula que en `useSaludContext`: 12–99). */
export function displayCompositeEnergyIndex(stored: number): number {
  if (!Number.isFinite(stored)) return 12
  return Math.min(99, Math.max(12, Math.round(stored)))
}
