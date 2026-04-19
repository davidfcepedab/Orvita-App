import { mondayOfCalendarWeekContainingYmd, unifiedRowInHorizon } from "@/lib/agenda/unifiedListHorizon"

describe("mondayOfCalendarWeekContainingYmd", () => {
  it("returns Monday for a Wednesday in April 2026", () => {
    expect(mondayOfCalendarWeekContainingYmd("2026-04-15")).toBe("2026-04-13")
  })
  it("returns previous Monday for a Sunday", () => {
    expect(mondayOfCalendarWeekContainingYmd("2026-04-19")).toBe("2026-04-13")
  })
})

describe("unifiedRowInHorizon", () => {
  it("excludes undated rows for today/tomorrow", () => {
    expect(unifiedRowInHorizon(null, "today", false)).toBe(false)
    expect(unifiedRowInHorizon("__sin_fecha__", "tomorrow", false)).toBe(false)
  })
  it("includes undated for week horizon", () => {
    expect(unifiedRowInHorizon(null, "this_week", false)).toBe(true)
  })
})
