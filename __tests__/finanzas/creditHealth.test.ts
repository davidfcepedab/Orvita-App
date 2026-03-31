import { creditHealthPctFromUsage } from "@/lib/finanzas/creditHealth"

describe("creditHealthPctFromUsage", () => {
  it("10% uso => salud 90", () => {
    expect(creditHealthPctFromUsage(10)).toBe(90)
  })

  it("50% uso => salud 50", () => {
    expect(creditHealthPctFromUsage(50)).toBe(50)
  })

  it("90% uso => salud 10", () => {
    expect(creditHealthPctFromUsage(90)).toBe(10)
  })

  it("clamp 0..100", () => {
    expect(creditHealthPctFromUsage(-20)).toBe(100)
    expect(creditHealthPctFromUsage(150)).toBe(0)
  })
})

