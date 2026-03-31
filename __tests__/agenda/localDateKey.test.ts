import {
  calendarEventLocalDayKey,
  formatLocalDateKey,
  localDateKeyFromIso,
} from "@/lib/agenda/localDateKey"

describe("localDateKeyFromIso", () => {
  test("fecha solo YYYY-MM-DD sin desfase por UTC", () => {
    expect(localDateKeyFromIso("2026-03-15")).toBe("2026-03-15")
  })

  test("all-day normalizado como medianoche UTC usa el día del prefijo", () => {
    expect(localDateKeyFromIso("2026-03-15T00:00:00.000Z")).toBe("2026-03-15")
  })

  test("instante con hora → día local", () => {
    const d = new Date(2026, 2, 15, 14, 30)
    const iso = d.toISOString()
    expect(localDateKeyFromIso(iso)).toBe(formatLocalDateKey(d))
  })
})

describe("calendarEventLocalDayKey", () => {
  test("allDay toma prefijo de fecha", () => {
    expect(
      calendarEventLocalDayKey({
        startAt: "2026-03-20T00:00:00.000Z",
        allDay: true,
      }),
    ).toBe("2026-03-20")
  })

  test("con hora usa localDateKeyFromIso", () => {
    const ev = {
      startAt: "2026-03-20T15:00:00.000Z",
      allDay: false,
    }
    expect(calendarEventLocalDayKey(ev)).toBe(localDateKeyFromIso(ev.startAt))
  })
})
