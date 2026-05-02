import { buildCategoryAnalyticsPayload } from "@/lib/finanzas/categoryAnalyticsEngine"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function tx(
  date: string,
  amount: number,
  category: string,
  subcategory: string,
): FinanceTransaction {
  return {
    id: `${date}-${category}-${subcategory}-${amount}`,
    date,
    description: "t",
    amount,
    type: "expense",
    category,
    subcategory,
    created_at: date,
    updated_at: date,
  }
}

describe("buildCategoryAnalyticsPayload operativo trend + weekday", () => {
  it("exposes trend keys for top categories and weekday insight when Friday dominates", () => {
    const txs: FinanceTransaction[] = [
      tx("2026-04-03", 100_000, "Domicilios", "Apps delivery"),
      tx("2026-04-10", 120_000, "Domicilios", "Apps delivery"),
      tx("2026-04-17", 90_000, "Domicilios", "Apps delivery"),
      tx("2026-04-24", 50_000, "Domicilios", "Apps delivery"),
      tx("2026-04-04", 20_000, "Domicilios", "Otros"),
      tx("2026-03-15", 40_000, "Domicilios", "Apps delivery"),
      tx("2026-02-10", 30_000, "Otra", "X"),
    ]

    const payload = buildCategoryAnalyticsPayload({
      txs,
      anchorMonth: "2026-04",
      scopeOperational: true,
      params: { historyMonths: 6, momAlertPct: 15 },
    })
    expect(payload).not.toBeNull()
    if (!payload) return

    expect(payload.topOperativeCategoryTrend.keys.length).toBeGreaterThan(0)
    expect(payload.topOperativeCategoryTrend.points.length).toBeGreaterThan(0)
    expect(payload.topOperativeCategoryTrend.pointsShare.length).toBe(payload.topOperativeCategoryTrend.points.length)
    expect(payload.topOperativeCategoryTrend.trendShareSummary.length).toBe(payload.topOperativeCategoryTrend.keys.length)
    const first = payload.topOperativeCategoryTrend.points[0]!
    expect(first.monthKey).toMatch(/^\d{4}-\d{2}$/)
    const shareFirst = payload.topOperativeCategoryTrend.pointsShare[0]!
    expect(shareFirst.monthKey).toBe(first.monthKey)
    expect(Number(shareFirst.c0)).toBeGreaterThanOrEqual(0)
    expect(Number(shareFirst.c0)).toBeLessThanOrEqual(100)

    const wd = payload.weekdayOperativeInsights.find((w) => w.category === "Domicilios")
    expect(wd).toBeDefined()
    expect(wd!.text.toLowerCase()).toMatch(/viernes/)
    expect(wd!.text).toMatch(/%/)
  })
})
