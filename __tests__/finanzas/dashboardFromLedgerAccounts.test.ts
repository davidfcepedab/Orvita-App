import { mergeLiveDashboardWithLedger, parseTcLabel } from "@/lib/finanzas/dashboardFromLedgerAccounts"
import type { CuentasDashboardPayload } from "@/lib/finanzas/cuentasDashboard"
import type { LedgerAccountSortable } from "@/lib/finanzas/sortLedgerAccounts"

describe("parseTcLabel", () => {
  test("parses pipe-separated TC label with last4", () => {
    expect(parseTcLabel("TC | Visa Scotia | David | 8696")).toEqual({
      bankLabel: "Scotia",
      network: "Visa",
      last4: "8696",
    })
  })

  test("parses Davivienda pattern", () => {
    const p = parseTcLabel("TC | Davivienda | David | 0386")
    expect(p.last4).toBe("0386")
    expect(p.bankLabel).toBe("Davivienda")
  })
})

describe("mergeLiveDashboardWithLedger", () => {
  const live: CuentasDashboardPayload = {
    kpis: {
      totalLiquidez: 10_000_000,
      liquidezTrendPct: 5,
      creditoDisponible: 1,
      creditoUsoPromedioPct: 1,
      deudaTotal: 1,
      deudaCuotaMensual: 1,
    },
    savings: [{ id: "x", institution: "X", label: "Synth", amount: 1, healthPct: 50, trendUp: true }],
    creditCards: [],
    loans: [],
  }

  test("replaces savings when ledger has ahorro", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "a1",
        label: "Ahorros | Bancolombia | Juan",
        account_class: "ahorro",
        nature: "activo_liquido",
        manual_balance: 2_500_000,
        sort_order: 0,
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, [])
    expect(out.savings).toHaveLength(1)
    expect(out.savings[0]!.id).toBe("ledger-a1")
    expect(out.savings[0]!.amount).toBe(2_500_000)
    expect(out.savings[0]!.institution).toBe("Bancolombia")
  })

  test("with only ahorro in ledger, clears synthetic debt KPIs", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "a1",
        label: "Ahorros | Davivienda | David",
        account_class: "ahorro",
        nature: "activo_liquido",
        manual_balance: 1_000_000,
        sort_order: 0,
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, [])
    expect(out.savings[0]!.id).toBe("ledger-a1")
    expect(out.creditCards).toHaveLength(0)
    expect(out.kpis.deudaTotal).toBe(0)
    expect(out.kpis.creditoDisponible).toBe(0)
  })

  test("maps tarjeta_credito and recalculates debt KPIs", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "c1",
        label: "TC | Visa Itau | Juan | 9485",
        account_class: "tarjeta_credito",
        nature: "pasivo_rotativo",
        credit_limit: 10_000_000,
        balance_used: 2_000_000,
        sort_order: 0,
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, [])
    expect(out.creditCards).toHaveLength(1)
    expect(out.creditCards[0]!.balance).toBe(2_000_000)
    expect(out.creditCards[0]!.limit).toBe(10_000_000)
    expect(out.kpis.deudaTotal).toBe(2_000_000)
    expect(out.kpis.creditoDisponible).toBe(8_000_000)
  })
})
