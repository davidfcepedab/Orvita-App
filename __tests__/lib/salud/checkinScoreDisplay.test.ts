import {
  clampCheckinScore0to100,
  displayCompositeEnergyIndex,
  normalizedCompositeEnergyIndex,
} from "@/lib/salud/checkinScoreDisplay"

describe("checkinScoreDisplay", () => {
  it("clampCheckinScore0to100 acota y redondea", () => {
    expect(clampCheckinScore0to100(8.4)).toBe(8)
    expect(clampCheckinScore0to100(-5)).toBe(0)
    expect(clampCheckinScore0to100(102)).toBe(100)
    expect(clampCheckinScore0to100(Number.NaN)).toBe(0)
  })

  it("displayCompositeEnergyIndex mantiene 12–99", () => {
    expect(displayCompositeEnergyIndex(45)).toBe(45)
    expect(displayCompositeEnergyIndex(5)).toBe(12)
    expect(displayCompositeEnergyIndex(120)).toBe(99)
  })

  it("normalizedCompositeEnergyIndex proyecta a 0–100 para semáforo", () => {
    expect(normalizedCompositeEnergyIndex(12)).toBe(0)
    expect(normalizedCompositeEnergyIndex(99)).toBe(100)
    expect(normalizedCompositeEnergyIndex(55)).toBe(49)
  })
})
