import { addDaysIso, parseBackfillCompletionDay, utcTodayIso } from "@/lib/habits/habitMetrics"

describe("parseBackfillCompletionDay", () => {
  const today = utcTodayIso()

  it("accepts today and yesterday", () => {
    const rToday = parseBackfillCompletionDay(today)
    expect(rToday.ok).toBe(true)
    if (rToday.ok) expect(rToday.day).toBe(today)
    const y = addDaysIso(today, -1)
    expect(parseBackfillCompletionDay(y).ok).toBe(true)
  })

  it("rejects future", () => {
    const t = addDaysIso(today, 1)
    const r = parseBackfillCompletionDay(t)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/futuro/i)
  })

  it("rejects invalid format or impossible date", () => {
    expect(parseBackfillCompletionDay("").ok).toBe(false)
    expect(parseBackfillCompletionDay("2025-02-31").ok).toBe(false)
    expect(parseBackfillCompletionDay("not-a-date").ok).toBe(false)
  })

  it("rejects beyond max past", () => {
    const tooOld = addDaysIso(today, -800)
    const r = parseBackfillCompletionDay(tooOld, { maxDaysPast: 730 })
    expect(r.ok).toBe(false)
  })
})
