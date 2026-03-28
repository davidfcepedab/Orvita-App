import {
  addMonthsYm,
  calendarQuarterMonthsThrough,
  eachMonthInclusive,
  rollingSemesterMonths,
  rollingYearMonths,
  rollingWindowStartYm,
} from "@/lib/finanzas/flowEvolutionBuckets"

describe("flowEvolutionBuckets", () => {
  test("eachMonthInclusive is inclusive and ordered", () => {
    expect(eachMonthInclusive("2026-01", "2026-03")).toEqual(["2026-01", "2026-02", "2026-03"])
    expect(eachMonthInclusive("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
  })

  test("rollingWindowStartYm covers 12 months", () => {
    expect(rollingWindowStartYm("2026-03", 12)).toBe("2025-04")
    expect(rollingYearMonths("2026-03")[0]).toBe("2025-04")
    expect(rollingYearMonths("2026-03")).toHaveLength(12)
  })

  test("calendar quarter through March is Q1 partial", () => {
    expect(calendarQuarterMonthsThrough("2026-03")).toEqual(["2026-01", "2026-02", "2026-03"])
    expect(calendarQuarterMonthsThrough("2026-02")).toEqual(["2026-01", "2026-02"])
  })

  test("rolling semester is 6 months ending at selected month", () => {
    expect(rollingSemesterMonths("2026-05")).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
    ])
    expect(rollingSemesterMonths("2026-08")).toHaveLength(6)
    expect(rollingSemesterMonths("2026-08")[0]).toBe("2026-03")
    expect(rollingSemesterMonths("2026-08")[5]).toBe("2026-08")
  })

  test("addMonthsYm rolls year boundaries", () => {
    expect(addMonthsYm("2026-01", -1)).toBe("2025-12")
    expect(addMonthsYm("2025-12", 1)).toBe("2026-01")
  })
})
