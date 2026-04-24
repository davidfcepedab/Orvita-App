import { normalizeOxygenToSpo2Pct, sanitizeBundleToHealthSignals } from "@/lib/integrations/appleHealthBundleContract"
import { rowsFromAppleBundlePayload } from "@/lib/integrations/mergeAppleHealthImportRows"

describe("appleHealthBundleContract", () => {
  test("normalizes HK-style oxygen fraction to SpO₂ %", () => {
    expect(normalizeOxygenToSpo2Pct(0.97)).toBe(97)
    expect(normalizeOxygenToSpo2Pct(97)).toBe(97)
  })

  test("builds health_signals from bundle with stable spo2_pct", () => {
    const hs = sanitizeBundleToHealthSignals({
      observed_at: "2026-04-23T12:00:00.000Z",
      steps: 5000,
      oxygen_saturation_avg: 0.98,
    })
    expect(hs.steps).toBe(5000)
    expect(hs.spo2_pct).toBe(98)
  })

  test("persists health_signals on import row metadata", () => {
    const [row] = rowsFromAppleBundlePayload({
      observed_at: "2026-04-23T12:00:00.000Z",
      steps: 100,
      vo2_max: 42.3,
    })
    expect(row).toBeDefined()
    const meta = row!.metadata as Record<string, unknown>
    expect(meta.health_signals).toBeDefined()
    const hs = meta.health_signals as Record<string, number>
    expect(hs.steps).toBe(100)
    expect(hs.vo2_max).toBe(42.3)
  })
})
