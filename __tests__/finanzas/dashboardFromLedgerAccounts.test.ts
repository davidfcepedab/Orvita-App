import { mergeLiveDashboardWithLedger, parseTcLabel } from "@/lib/finanzas/dashboardFromLedgerAccounts"
import type { CuentasDashboardPayload } from "@/lib/finanzas/cuentasDashboard"
import type { LedgerAccountSortable } from "@/lib/finanzas/sortLedgerAccounts"
import type { FinanceTransaction } from "@/lib/finanzas/types"

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

  test("prefers balance_available when manual_balance is zero without manual_balance_on", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "a1",
        label: "Ahorros | Bancolombia | Juan",
        account_class: "ahorro",
        nature: "activo_liquido",
        manual_balance: 0,
        balance_available: 3_000_000,
        sort_order: 0,
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, [])
    expect(out.savings[0]!.amount).toBe(3_000_000)
  })

  test("derives TC balance from movements when balance_used is zero", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "c1",
        label: "TC | Visa Villas | Juan | 5419",
        account_class: "tarjeta_credito",
        nature: "pasivo_rotativo",
        credit_limit: 25_000_000,
        balance_used: 0,
        sort_order: 0,
      },
    ]
    const rows: FinanceTransaction[] = [
      {
        id: "t1",
        date: "2026-03-10",
        description: "Compra",
        amount: 150_000,
        type: "expense",
        category: "Otros",
        created_at: "2026-03-10T00:00:00Z",
        updated_at: "2026-03-10T00:00:00Z",
        finance_account_id: "c1",
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, rows)
    expect(out.creditCards[0]!.balance).toBe(150_000)
    expect(out.creditCards[0]!.usagePct).toBe(1)
  })

  test("derives TC balance via last4 in description when cuenta columns empty", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "c1",
        label: "TC | Visa Villas | Juan | 5419",
        account_class: "tarjeta_credito",
        nature: "pasivo_rotativo",
        credit_limit: 25_000_000,
        balance_used: 0,
        sort_order: 0,
      },
    ]
    const rows: FinanceTransaction[] = [
      {
        id: "t1",
        date: "2026-03-10",
        description: "Supermercado · TC 5419",
        amount: 220_000,
        type: "expense",
        category: "Otros",
        created_at: "2026-03-10T00:00:00Z",
        updated_at: "2026-03-10T00:00:00Z",
        account_label: "",
        finance_account_id: null,
      },
    ]
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, rows)
    expect(out.creditCards[0]!.balance).toBe(220_000)
  })

  test("TC balance acumula meses anteriores al mes mostrado", () => {
    const ledger: LedgerAccountSortable[] = [
      {
        id: "c1",
        label: "TC | Visa Villas | Juan | 5419",
        account_class: "tarjeta_credito",
        nature: "pasivo_rotativo",
        credit_limit: 25_000_000,
        balance_used: 0,
        sort_order: 0,
      },
    ]
    const rollup: FinanceTransaction[] = [
      {
        id: "t0",
        date: "2026-02-12",
        description: "Compra feb",
        amount: 300_000,
        type: "expense",
        category: "Otros",
        created_at: "2026-02-12T00:00:00Z",
        updated_at: "2026-02-12T00:00:00Z",
        finance_account_id: "c1",
      },
      {
        id: "t1",
        date: "2026-03-02",
        description: "Compra mar",
        amount: 100_000,
        type: "expense",
        category: "Otros",
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
        finance_account_id: "c1",
      },
    ]
    const monthOnlyMarch = rollup.filter((r) => r.date.startsWith("2026-03"))
    const out = mergeLiveDashboardWithLedger(live, "2026-03", ledger, monthOnlyMarch, rollup)
    expect(out.creditCards[0]!.balance).toBe(400_000)
  })
})
