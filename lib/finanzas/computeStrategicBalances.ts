import type { StrategicBalancesBreakdown, StrategicBalancesResult } from "@/lib/finanzas/accountBalanceTypes"
import type { CuentasCreditCard, CuentasLoanCard, CuentasSavingsCard } from "@/lib/finanzas/cuentasDashboard"

function facetFromSavings(s: CuentasSavingsCard) {
  const cupo = s.cupo ?? 0
  const uso = s.uso ?? s.amount
  const creditosExtras = s.creditosExtras ?? 0
  const ajuste = s.ajusteManual ?? 0
  const disponible =
    s.disponibleOperativoLine ??
    Math.round(cupo + uso + creditosExtras + ajuste)
  return { cupo, uso, creditosExtras, ajuste, disponible, label: s.label }
}

function facetFromCredit(c: CuentasCreditCard) {
  const cupo = c.cupo ?? c.limit
  const debt = c.balance
  const uso = c.uso ?? -debt
  const creditosExtras = c.creditosExtras ?? 0
  const ajuste = c.ajusteManual ?? 0
  const disponible =
    c.disponibleOperativoLine ??
    Math.round(cupo + uso + creditosExtras + ajuste)
  return { cupo, uso, creditosExtras, ajuste, disponible, label: `${c.bankLabel} ${c.last4}` }
}

function facetFromLoan(l: CuentasLoanCard) {
  const cupo = l.cupo ?? l.montoOriginal
  const uso = l.uso ?? -l.saldoPendiente
  const creditosExtras = l.creditosExtras ?? 0
  const ajuste = l.ajusteManual ?? 0
  const disponible =
    l.disponibleOperativoLine ?? Math.round(cupo + uso + creditosExtras + ajuste)
  return { cupo, uso, creditosExtras, ajuste, disponible, label: l.title }
}

/**
 * Agrega los tres saldos estratégicos a partir de tarjetas ya fusionadas (ledger + manual).
 * `pendienteOutflows`: transacciones comprometidas aún no contabilizadas (hasta tener campo en TX).
 * `deltaProyectado`: ingresos programados − gastos programados en el horizonte (p. ej. del simulador).
 */
export function computeStrategicBalances(
  savings: CuentasSavingsCard[],
  creditCards: CuentasCreditCard[],
  loans: CuentasLoanCard[],
  options?: {
    pendienteOutflows?: number
    /** Ingresos − gastos programados (30–90d), positivo si sobra. */
    deltaProyectado?: number
  },
): StrategicBalancesResult {
  const pendienteOutflows = Math.max(0, Number(options?.pendienteOutflows) || 0)
  const deltaProyectado = Number(options?.deltaProyectado) || 0

  let saldoLiquido = 0
  let tarjetasDisponible = 0
  let estructuralesDisponible = 0
  const negativeDisponibleWarnings: { label: string; disponible: number }[] = []

  for (const s of savings) {
    const f = facetFromSavings(s)
    saldoLiquido += f.disponible
    if (f.disponible < 0) negativeDisponibleWarnings.push({ label: f.label, disponible: f.disponible })
  }

  for (const c of creditCards) {
    const f = facetFromCredit(c)
    tarjetasDisponible += f.disponible
    if (f.disponible < 0) negativeDisponibleWarnings.push({ label: f.label, disponible: f.disponible })
  }

  for (const l of loans) {
    const f = facetFromLoan(l)
    estructuralesDisponible += f.disponible
    if (f.disponible < 0) negativeDisponibleWarnings.push({ label: f.label, disponible: f.disponible })
  }

  const breakdown: StrategicBalancesBreakdown = {
    ahorrosLiquido: Math.round(saldoLiquido),
    tarjetasDisponible: Math.round(tarjetasDisponible),
    estructuralesDisponible: Math.round(estructuralesDisponible),
    pendienteOutflows: Math.round(pendienteOutflows),
  }

  const saldoDisponibleOperativo = Math.round(
    saldoLiquido + tarjetasDisponible + estructuralesDisponible - pendienteOutflows,
  )

  const saldoProyectado = Math.round(saldoDisponibleOperativo + deltaProyectado)

  return {
    saldoLiquido: Math.round(saldoLiquido),
    saldoDisponibleOperativo,
    saldoProyectado,
    breakdown,
    negativeDisponibleWarnings,
  }
}
