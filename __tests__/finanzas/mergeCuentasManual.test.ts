import { mergeCuentasDashboard } from "@/lib/finanzas/mergeCuentasManual"
import type { CuentasDashboardPayload } from "@/lib/finanzas/cuentasDashboard"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

const emptyManual = (): ManualFinanceBundle => ({
  savings: [],
  creditCards: [],
  loans: [],
  hiddenSyntheticIds: [],
})

describe("mergeCuentasDashboard", () => {
  test("hereda saldo del ledger cuando un manual reemplaza ledger-* con balance 0", () => {
    const base: CuentasDashboardPayload = {
      kpis: {
        totalLiquidez: 0,
        liquidezTrendPct: 0,
        creditoDisponible: 0,
        creditoUsoPromedioPct: 0,
        deudaTotal: 0,
        deudaCuotaMensual: 0,
      },
      savings: [],
      creditCards: [
        {
          id: "ledger-c1",
          bankLabel: "Itau",
          network: "Visa",
          last4: "9485",
          balance: 3_200_000,
          limit: 19_400_000,
          usagePct: 17,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 80,
          theme: "itau",
        },
      ],
      loans: [],
    }
    const manual: ManualFinanceBundle = {
      ...emptyManual(),
      creditCards: [
        {
          id: "manual-cc-xyz",
          bankLabel: "Itau",
          network: "Visa",
          last4: "9485",
          balance: 0,
          limit: 19_400_000,
          usagePct: 0,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 88,
          theme: "itau",
          replacesSyntheticId: "ledger-c1",
        },
      ],
    }
    const out = mergeCuentasDashboard(base, manual)
    expect(out.creditCards).toHaveLength(1)
    expect(out.creditCards[0]!.id).toBe("manual-cc-xyz")
    expect(out.creditCards[0]!.balance).toBe(3_200_000)
    expect(out.creditCards[0]!.usagePct).toBe(
      Math.min(100, Math.round((3_200_000 / 19_400_000) * 100)),
    )
  })

  test("no sobrescribe un manual con balance positivo", () => {
    const base: CuentasDashboardPayload = {
      kpis: {
        totalLiquidez: 0,
        liquidezTrendPct: 0,
        creditoDisponible: 0,
        creditoUsoPromedioPct: 0,
        deudaTotal: 0,
        deudaCuotaMensual: 0,
      },
      savings: [],
      creditCards: [
        {
          id: "ledger-c1",
          bankLabel: "Itau",
          network: "Visa",
          last4: "9485",
          balance: 9_000_000,
          limit: 19_400_000,
          usagePct: 46,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 70,
          theme: "itau",
        },
      ],
      loans: [],
    }
    const manual: ManualFinanceBundle = {
      ...emptyManual(),
      creditCards: [
        {
          id: "manual-cc-xyz",
          bankLabel: "Itau",
          network: "Visa",
          last4: "9485",
          balance: 500_000,
          limit: 19_400_000,
          usagePct: 3,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 88,
          theme: "itau",
          replacesSyntheticId: "ledger-c1",
        },
      ],
    }
    const out = mergeCuentasDashboard(base, manual)
    expect(out.creditCards[0]!.balance).toBe(500_000)
  })

  test("oculta ledger con replacesSyntheticId solo UUID (sin prefijo ledger-)", () => {
    const ledgerId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    const base: CuentasDashboardPayload = {
      kpis: {
        totalLiquidez: 0,
        liquidezTrendPct: 0,
        creditoDisponible: 0,
        creditoUsoPromedioPct: 0,
        deudaTotal: 0,
        deudaCuotaMensual: 0,
      },
      savings: [],
      creditCards: [
        {
          id: `ledger-${ledgerId}`,
          bankLabel: "Test",
          network: "Visa",
          last4: "1111",
          balance: 1_000_000,
          limit: 5_000_000,
          usagePct: 20,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 80,
          theme: "bbva",
        },
      ],
      loans: [],
    }
    const manual: ManualFinanceBundle = {
      ...emptyManual(),
      creditCards: [
        {
          id: "manual-cc-1",
          bankLabel: "Test",
          network: "Visa",
          last4: "1111",
          balance: 0,
          limit: 5_000_000,
          usagePct: 0,
          paymentDueLabel: "Pago: Abr 5",
          paymentDay: 5,
          score: 88,
          theme: "bbva",
          replacesSyntheticId: ledgerId,
        },
      ],
    }
    const out = mergeCuentasDashboard(base, manual)
    expect(out.creditCards).toHaveLength(1)
    expect(out.creditCards[0]!.id).toBe("manual-cc-1")
    expect(out.creditCards[0]!.balance).toBe(1_000_000)
  })
})
