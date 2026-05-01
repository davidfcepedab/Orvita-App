import {
  mondayOfCalendarWeekContainingYmd,
  unifiedListHorizonRange,
  unifiedRowInHorizon,
} from "@/lib/agenda/unifiedListHorizon"

describe("mondayOfCalendarWeekContainingYmd", () => {
  it("returns Monday for a Wednesday in April 2026", () => {
    expect(mondayOfCalendarWeekContainingYmd("2026-04-15")).toBe("2026-04-13")
  })
  it("returns previous Monday for a Sunday", () => {
    expect(mondayOfCalendarWeekContainingYmd("2026-04-19")).toBe("2026-04-13")
  })
})

describe("unifiedRowInHorizon", () => {
  it("undated only excluded for Mañana (unknown slot)", () => {
    expect(unifiedRowInHorizon(null, "today", false)).toBe(true)
    expect(unifiedRowInHorizon("__sin_fecha__", "tomorrow", false)).toBe(false)
  })
  it("includes undated for week horizon", () => {
    expect(unifiedRowInHorizon(null, "this_week", false)).toBe(true)
  })
})

describe("unifiedListHorizonRange", () => {
  it("this_week spans Monday–Sunday so past weekdays stay visible", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-05-01T12:00:00Z"))
    const { start, end } = unifiedListHorizonRange("this_week", { extendedAfterMonth: false })
    expect(start).toBe("2026-04-27")
    expect(end).toBe("2026-05-03")
    jest.useRealTimers()
  })
  it("this_month starts on day 1 of current month", () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-05-15T12:00:00Z"))
    const { start, end } = unifiedListHorizonRange("this_month", { extendedAfterMonth: false })
    expect(start).toBe("2026-05-01")
    expect(end).toBe("2026-05-31")
    jest.useRealTimers()
  })
})
