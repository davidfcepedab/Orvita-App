import { addCalendarDaysYmd, diffCalendarDaysYmd } from "@/lib/agenda/calendarMath"

describe("addCalendarDaysYmd", () => {
  test("suma días en calendario gregoriano", () => {
    expect(addCalendarDaysYmd("2026-01-01", 1)).toBe("2026-01-02")
    expect(addCalendarDaysYmd("2026-01-01", -1)).toBe("2025-12-31")
  })

  test("cruza mes y año bisiesto", () => {
    expect(addCalendarDaysYmd("2024-02-28", 1)).toBe("2024-02-29")
    expect(addCalendarDaysYmd("2024-02-29", 1)).toBe("2024-03-01")
    expect(addCalendarDaysYmd("2023-02-28", 1)).toBe("2023-03-01")
  })
})

describe("diffCalendarDaysYmd", () => {
  test("mismo día → 0", () => {
    expect(diffCalendarDaysYmd("2026-04-12", "2026-04-12")).toBe(0)
  })

  test("diferencia con signo (to − from)", () => {
    expect(diffCalendarDaysYmd("2026-04-10", "2026-04-12")).toBe(2)
    expect(diffCalendarDaysYmd("2026-04-12", "2026-04-10")).toBe(-2)
  })
})
