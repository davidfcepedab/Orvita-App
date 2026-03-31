import {
  ahorroSaldoOperativoFromCatalog,
  creditoSaldoPendienteFromCatalog,
} from "@/lib/finanzas/catalogLedgerBalances"

describe("ahorroSaldoOperativoFromCatalog", () => {
  test("sin anclar: balance_available gana sobre manual positivo (misma regla que TC / extracto)", () => {
    expect(
      ahorroSaldoOperativoFromCatalog({
        manual_balance: 50_000,
        balance_available: 3_472_626,
      }),
    ).toBe(3_472_626)
  })

  test("con manual_balance_on: manda manual aunque haya disponible distinto", () => {
    expect(
      ahorroSaldoOperativoFromCatalog({
        manual_balance: 1_000_000,
        manual_balance_on: "2026-03-15",
        balance_available: 31_295_266,
      }),
    ).toBe(1_000_000)
  })
})

describe("creditoSaldoPendienteFromCatalog", () => {
  test("prioriza balance_used", () => {
    expect(
      creditoSaldoPendienteFromCatalog({
        balance_used: 90_540_792,
        balance_available: 1,
      }),
    ).toBe(90_540_792)
  })

  test("fallback a balance_available si usado vacío (columna tipo extracto)", () => {
    expect(
      creditoSaldoPendienteFromCatalog({
        balance_used: 0,
        balance_available: 113_750_000,
      }),
    ).toBe(113_750_000)
  })
})
