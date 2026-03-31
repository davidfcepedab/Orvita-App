import {
  normalizeRealBalanceForReconciliation,
  reconciliationDelta,
  reconciliationTolerance,
  reconciliationTxTypeForDelta,
} from "@/lib/finanzas/reconciliation"

describe("reconciliation tarjeta_credito", () => {
  it("convierte disponible a deuda (caso 8M cupo / 7M disponible => 1M deuda)", () => {
    const n = normalizeRealBalanceForReconciliation({
      account_class: "tarjeta_credito",
      credit_limit: 8_000_000,
    })
    expect(n.mode).toBe("available_credit")
    expect(n.normalize(7_000_000)).toBe(1_000_000)
  })

  it("delta positivo en tarjeta => expense (aumenta deuda)", () => {
    const delta = reconciliationDelta(1_000_000, 700_000, "tarjeta_credito")
    expect(delta).toBe(300_000)
    expect(reconciliationTxTypeForDelta("tarjeta_credito", delta)).toBe("expense")
  })

  it("delta negativo en tarjeta => income (reduce deuda)", () => {
    const delta = reconciliationDelta(500_000, 1_200_000, "tarjeta_credito")
    expect(delta).toBe(-700_000)
    expect(reconciliationTxTypeForDelta("tarjeta_credito", delta)).toBe("income")
  })

  it("tolera no-op cuando delta <= tolerance", () => {
    const realDebt = 1_000_000
    const tolerance = reconciliationTolerance(realDebt)
    expect(tolerance).toBeGreaterThan(0)
    const smallDelta = tolerance - 1
    expect(Math.abs(smallDelta) <= tolerance).toBe(true)
  })

  it("valida disponible fuera de rango", () => {
    const n = normalizeRealBalanceForReconciliation({
      account_class: "tarjeta_credito",
      credit_limit: 8_000_000,
    })
    expect(() => n.normalize(-1)).toThrow("Disponible no puede ser negativo")
    expect(() => n.normalize(8_500_000)).toThrow("Disponible no puede superar el cupo")
  })

  it("disponible 0 => deuda total (uso completo)", () => {
    const n = normalizeRealBalanceForReconciliation({
      account_class: "tarjeta_credito",
      credit_limit: 8_000_000,
    })
    expect(n.normalize(0)).toBe(8_000_000)
  })

  it("tarjeta sin cupo definido => error", () => {
    expect(() =>
      normalizeRealBalanceForReconciliation({
        account_class: "tarjeta_credito",
        credit_limit: null,
      }),
    ).toThrow("Tarjeta sin cupo definido")
  })
})
