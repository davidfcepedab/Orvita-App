import {
  calendarRowOverlapsWindow,
  externalCalendarRowToDto,
} from "@/lib/google/calendarFromExternalEvents"

describe("calendarRowOverlapsWindow", () => {
  const wMin = "2026-04-01T00:00:00.000Z"
  const wMax = "2026-04-30T23:59:59.999Z"

  test("evento totalmente dentro", () => {
    expect(
      calendarRowOverlapsWindow("2026-04-10T10:00:00.000Z", "2026-04-10T11:00:00.000Z", wMin, wMax),
    ).toBe(true)
  })

  test("empieza antes y termina dentro de la ventana", () => {
    expect(
      calendarRowOverlapsWindow("2026-03-28T10:00:00.000Z", "2026-04-05T11:00:00.000Z", wMin, wMax),
    ).toBe(true)
  })

  test("sin solapamiento antes", () => {
    expect(
      calendarRowOverlapsWindow("2026-03-01T10:00:00.000Z", "2026-03-28T11:00:00.000Z", wMin, wMax),
    ).toBe(false)
  })

  test("sin solapamiento después", () => {
    expect(
      calendarRowOverlapsWindow("2026-05-05T10:00:00.000Z", "2026-05-06T11:00:00.000Z", wMin, wMax),
    ).toBe(false)
  })
})

describe("externalCalendarRowToDto", () => {
  test("all-day desde raw", () => {
    const dto = externalCalendarRowToDto({
      google_event_id: "e1",
      summary: "X",
      start_at: "2026-04-07T00:00:00.000Z",
      end_at: "2026-04-08T00:00:00.000Z",
      raw: { start: { date: "2026-04-07" }, end: { date: "2026-04-08" } },
    })
    expect(dto?.allDay).toBe(true)
  })
})
