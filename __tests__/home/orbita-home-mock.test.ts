/**
 * Pruebas de contrato del mock de Inicio (Órvita / Órbita home).
 * Aseguran que Capital operativo, predictivo y widgets mantienen forma estable para UI y gráficos.
 */

import { getOrbitaHomeMock } from "@/app/home/_lib/orbita-home-mock"

function assertPct(name: string, v: number) {
  expect(v).toBeGreaterThanOrEqual(0)
  expect(v).toBeLessThanOrEqual(100)
}

describe("getOrbitaHomeMock", () => {
  it("expone capital operativo (tiempo, energía, dinero) con rangos coherentes", () => {
    const m = getOrbitaHomeMock()
    const { time, energy, money } = m.capital

    expect(time.availableHours).toBeGreaterThan(0)
    expect(time.consumedHours).toBeGreaterThanOrEqual(0)
    assertPct("strategicFocusPct", time.strategicFocusPct)

    assertPct("currentLevelPct", energy.currentLevelPct)
    expect(energy.trend7d).toHaveLength(7)
    energy.trend7d.forEach((v, i) => {
      assertPct(`trend7d[${i}]`, v)
    })
    assertPct("burnoutRiskPct", energy.burnoutRiskPct)

    expect(typeof money.netMonthlyCOP).toBe("number")
    expect(money.runwayDays).toBeGreaterThanOrEqual(0)
    assertPct("financialPressurePct", money.financialPressurePct)
  })

  it("genera 30 puntos predictivos con métricas 0–100", () => {
    const { points30d } = getOrbitaHomeMock().predictive
    expect(points30d).toHaveLength(30)
    points30d.forEach((p, i) => {
      expect(p.day.length).toBeGreaterThan(0)
      assertPct(`points30d[${i}].timeLoad`, p.timeLoad)
      assertPct(`points30d[${i}].energy`, p.energy)
      assertPct(`points30d[${i}].moneyPressure`, p.moneyPressure)
      assertPct(`points30d[${i}].flowScore`, p.flowScore)
    })
  })

  it("incluye alertas, acciones inteligentes y widgets con ids únicos", () => {
    const m = getOrbitaHomeMock()
    const alertIds = m.alerts.map((a) => a.id)
    expect(new Set(alertIds).size).toBe(alertIds.length)

    const smartIds = m.smartActions.map((s) => s.id)
    expect(new Set(smartIds).size).toBe(smartIds.length)

    expect(m.widgets.decisions.length).toBeGreaterThan(0)
    expect(m.widgets.agendaToday.length).toBeGreaterThan(0)
    expect(m.widgets.habits.length).toBeGreaterThan(0)
  })

  it("expone formatCOP utilizable en paneles", () => {
    const m = getOrbitaHomeMock()
    const s = m.formatCOP(-1_450_000)
    expect(s).toMatch(/1[\s.]*450/)
  })
})
