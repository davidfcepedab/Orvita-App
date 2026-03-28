import type { FinanceTransaction } from "@/lib/finanzas/types"

/** Datos demo por mes (para NEXT_PUBLIC_APP_MODE=mock). */
export function mockTransactionsForMonth(month: string): FinanceTransaction[] {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return []

  const iso = (d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  const base: Omit<FinanceTransaction, "date" | "id" | "amount" | "type" | "description" | "category" | "subcategory"> = {
    profile_id: "demo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return [
    {
      ...base,
      id: `${month}-1`,
      date: iso(2),
      description: "Ingreso nómina",
      amount: 4_200_000 + (m % 3) * 120_000,
      type: "income",
      category: "Ingresos",
      subcategory: "Salario",
    },
    {
      ...base,
      id: `${month}-2`,
      date: iso(4),
      description: "Arriendo / vivienda",
      amount: 2_100_000,
      type: "expense",
      category: "Vivienda",
      subcategory: "Arriendo",
    },
    {
      ...base,
      id: `${month}-3`,
      date: iso(7),
      description: "Supermercado",
      amount: 620_000 + m * 15_000,
      type: "expense",
      category: "Estilo de vida",
      subcategory: "Alimentación",
    },
    {
      ...base,
      id: `${month}-4`,
      date: iso(9),
      description: "Suscripción software (SaaS)",
      amount: 280_000,
      type: "expense",
      category: "Operación",
      subcategory: "Software",
    },
    {
      ...base,
      id: `${month}-5`,
      date: iso(11),
      description: "Seguro salud",
      amount: 410_000,
      type: "expense",
      category: "Seguro & Salud",
      subcategory: "Póliza",
    },
    {
      ...base,
      id: `${month}-6`,
      date: iso(15),
      description: "Proyecto freelance",
      amount: 980_000,
      type: "income",
      category: "Ingresos",
      subcategory: "Servicios",
    },
    {
      ...base,
      id: `${month}-7`,
      date: iso(18),
      description: "Transporte / movilidad",
      amount: 240_000,
      type: "expense",
      category: "Estilo de vida",
      subcategory: "Movilidad",
    },
    {
      ...base,
      id: `${month}-8`,
      date: iso(22),
      description: "Internet residencial",
      amount: 120_000,
      type: "expense",
      category: "Vivienda",
      subcategory: "Servicios",
    },
  ]
}
