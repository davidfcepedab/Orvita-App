/**
 * Modelo de saldos Órvita — Capital operativo (dinero).
 * Disponible por cuenta (on-the-fly): cupo + creditosExtras + uso + ajusteManual
 * - Ahorros: cupo=0, uso = efectivo reconocido (positivo).
 * - TC: cupo = línea, uso = −deuda cargada (negativo).
 * - Crédito estructural: cupo = tope/original, uso = −saldo pendiente.
 */

export type AccountBalanceFacet = {
  cupo: number
  /** Pasivos: negativo (deuda). Activos líquidos: positivo (efectivo). */
  uso: number
  creditosExtras: number
  /** Ajuste de reconciliación puntual (suma algebraica al disponible). */
  ajusteManual: number
  fechaUltimaReconciliacion: string | null
  /** Resultado de la fórmula oficial por cuenta. */
  disponible: number
}

export type StrategicBalancesBreakdown = {
  ahorrosLiquido: number
  tarjetasDisponible: number
  estructuralesDisponible: number
  pendienteOutflows: number
}

/** Totales de alto nivel (siempre calculados en cliente; no persistir agregados). */
export type StrategicBalancesResult = {
  saldoLiquido: number
  saldoDisponibleOperativo: number
  saldoProyectado: number
  breakdown: StrategicBalancesBreakdown
  /** Cuentas con disponible < 0 (revisar). */
  negativeDisponibleWarnings: { label: string; disponible: number }[]
}

/**
 * Fórmula única de disponible por cuenta.
 * uso ya trae signo: + en activo líquido, − en deuda.
 */
export function computeDisponibleCuenta(
  cupo: number,
  uso: number,
  creditosExtras: number,
  ajusteManual: number,
): number {
  const c = Number.isFinite(cupo) ? cupo : 0
  const u = Number.isFinite(uso) ? uso : 0
  const x = Number.isFinite(creditosExtras) ? creditosExtras : 0
  const a = Number.isFinite(ajusteManual) ? ajusteManual : 0
  return Math.round(c + u + x + a)
}
