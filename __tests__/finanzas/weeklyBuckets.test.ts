import { buildWeeklyBuckets, startOfIsoWeekContaining } from "@/lib/finanzas/deriveFromTransactions"
import { expenseAmount } from "@/lib/finanzas/calculations/txMath"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function tx(date: string, amount: number, kind: "income" | "expense"): FinanceTransaction {
  const now = new Date().toISOString()
  return {
    id: `t-${date}-${amount}`,
    date,
    description: "x",
    category: "c",
    subcategory: "s",
    amount,
    type: kind,
    created_at: now,
    updated_at: now,
  }
}

describe("buildWeeklyBuckets (4 semanas corridas)", () => {
  test("siempre devuelve 4 filas", () => {
    const rows: FinanceTransaction[] = []
    const out = buildWeeklyBuckets("2026-03", rows, expenseAmount)
    expect(out).toHaveLength(4)
    expect(out.every((r) => r.month.includes("–"))).toBe(true)
  })

  test("sin movimientos en el mes, ancla al fin de mes (4 semanas terminando en esa semana)", () => {
    const out = buildWeeklyBuckets("2026-03", [], expenseAmount)
    expect(out).toHaveLength(4)
    expect(out[0]!.flujo).toBe(0)
    expect(out[3]!.flujo).toBe(0)
  })

  test("agrega por ventana de fechas y usa allRowsForWeekWindow para cruces de mes", () => {
    const march = "2026-03"
    const inMonth = [tx("2026-03-15", 100_000, "income")]
    const pool = [...inMonth, tx("2026-02-28", 50_000, "expense")]
    const out = buildWeeklyBuckets(march, inMonth, expenseAmount, { allRowsForWeekWindow: pool })
    expect(out).toHaveLength(4)
    const withMovement = out.find((r) => r.ingresos > 0 || r.gasto_operativo > 0)
    expect(withMovement).toBeDefined()
    expect(withMovement!.ingresos).toBe(100_000)
  })
})

describe("startOfIsoWeekContaining", () => {
  test("un miércoles cae en el lunes correcto", () => {
    const wed = new Date(2026, 2, 18) // 18 mar 2026 miércoles
    const mon = startOfIsoWeekContaining(wed)
    expect(mon.getFullYear()).toBe(2026)
    expect(mon.getMonth()).toBe(2)
    expect(mon.getDate()).toBe(16)
    expect(mon.getDay()).toBe(1)
  })
})
