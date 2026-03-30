import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import { pickObligationExpenses } from "@/lib/finanzas/deriveFromTransactions"

export type FinanceAccountCard = {
  id: string
  name: string
  type: string
  institution: string
  available: number
  debt: number
  limit: number
  status: "saludable" | "atencion" | "critica"
  score: number
  alerts: string[]
  nature: string
  monthlyUse: number
  projectedClose: number
  riskNote: string
}

/** Vista tipo “cuentas” derivada de snapshot + movimientos (sin tabla dedicada). */
export function buildSyntheticAccounts(
  month: string,
  snapshotBalance: number | null,
  rows: FinanceTransaction[],
): FinanceAccountCard[] {
  const inMonth = rows.filter((r) => r.date.startsWith(month))
  const income = inMonth.reduce((a, t) => a + incomeAmount(t), 0)
  const expense = inMonth.reduce((a, t) => a + expenseAmount(t), 0)
  const net = netCashFlow(inMonth)

  const balance = typeof snapshotBalance === "number" && Number.isFinite(snapshotBalance) ? snapshotBalance : net

  const utilization = income > 0 ? Math.min(1.2, expense / income) : expense > 0 ? 1 : 0
  const scoreLiquidity = Math.max(0, Math.min(100, Math.round(100 - utilization * 55 + (net > 0 ? 12 : -18))))

  const status: FinanceAccountCard["status"] =
    scoreLiquidity >= 72 ? "saludable" : scoreLiquidity >= 48 ? "atencion" : "critica"

  const obligations = pickObligationExpenses(inMonth)
  const debtProxy = obligations.reduce((a, t) => a + expenseAmount(t), 0)

  const alerts: string[] = []
  if (net < 0) alerts.push("Flujo neto negativo este mes")
  if (utilization > 0.92) alerts.push("Gastos cercanos o superiores a ingresos")

  const main: FinanceAccountCard = {
    id: "consolidado-snapshot",
    name: "Saldo consolidado (hogar)",
    type: "Consolidado",
    institution: "Órvita / Supabase",
    available: Math.round(Math.max(0, balance)),
    debt: 0,
    limit: 0,
    status,
    score: scoreLiquidity,
    alerts,
    nature: "Balance mensual estimado (snapshot o flujo)",
    monthlyUse: Math.round(expense),
    projectedClose: Math.round(balance + net * 0.25),
    riskNote:
      net >= 0
        ? "Capacidad de ahorro positiva en el mes seleccionado"
        : "Revisa gastos recurrentes y obligaciones",
  }

  const obligationsCard: FinanceAccountCard = {
    id: "obligaciones-mes",
    name: "Obligaciones detectadas",
    type: "Compromisos",
    institution: "Derivado de categorías",
    available: 0,
    debt: Math.round(debtProxy),
    limit: Math.round(income * 0.65),
    status: debtProxy > income * 0.55 ? "atencion" : "saludable",
    score: Math.max(35, Math.min(95, 100 - Math.round((debtProxy / Math.max(1, income)) * 60))),
    alerts: obligations.length === 0 ? ["Sin obligaciones fijas detectadas por heurística"] : [],
    nature: "Suma de gastos con patrón fijo / vivienda",
    monthlyUse: Math.round(debtProxy),
    projectedClose: Math.round(debtProxy * 1.02),
    riskNote: `${obligations.length} movimientos clasificados como obligatorios`,
  }

  return [main, obligationsCard]
}
