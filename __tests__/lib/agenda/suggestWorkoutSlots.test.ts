import {
  addCalendarDaysToYmd,
  googleCalendarTemplateUrl,
  suggestWorkoutSlots,
  zonedWallInstant,
} from "@/lib/agenda/suggestWorkoutSlots"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

const TZ = "UTC"

describe("zonedWallInstant", () => {
  it("resolves midnight and 08:00 in UTC", () => {
    const d0 = zonedWallInstant("2026-06-15", 0, 0, TZ)
    const d8 = zonedWallInstant("2026-06-15", 8, 0, TZ)
    expect(d0?.toISOString()).toBe("2026-06-15T00:00:00.000Z")
    expect(d8?.toISOString()).toBe("2026-06-15T08:00:00.000Z")
  })
})

describe("addCalendarDaysToYmd", () => {
  it("adds one civil day in UTC", () => {
    expect(addCalendarDaysToYmd("2026-06-15", 1, TZ)).toBe("2026-06-16")
  })
})

describe("suggestWorkoutSlots", () => {
  it("returns first morning slot when calendar is empty", () => {
    const slots = suggestWorkoutSlots({
      events: [],
      startYmd: "2026-06-15",
      horizonDays: 1,
      durationMinutes: 60,
      timeZone: TZ,
      maxSlots: 2,
    })
    expect(slots.length).toBeGreaterThanOrEqual(1)
    expect(slots[0].startAt).toBe("2026-06-15T08:00:00.000Z")
    expect(slots[0].endAt).toBe("2026-06-15T09:00:00.000Z")
  })

  it("skips a busy block and starts after it", () => {
    const events: GoogleCalendarEventDTO[] = [
      {
        id: "1",
        summary: "Busy",
        startAt: "2026-06-15T08:00:00.000Z",
        endAt: "2026-06-15T10:00:00.000Z",
        allDay: false,
      },
    ]
    const slots = suggestWorkoutSlots({
      events,
      startYmd: "2026-06-15",
      horizonDays: 1,
      durationMinutes: 60,
      timeZone: TZ,
      maxSlots: 2,
    })
    expect(slots[0].startAt).toBe("2026-06-15T10:00:00.000Z")
    expect(slots[0].endAt).toBe("2026-06-15T11:00:00.000Z")
  })

  it("filters afternoon pref", () => {
    const events: GoogleCalendarEventDTO[] = [
      {
        id: "1",
        summary: "Morning block",
        startAt: "2026-06-15T08:00:00.000Z",
        endAt: "2026-06-15T14:00:00.000Z",
        allDay: false,
      },
    ]
    const slots = suggestWorkoutSlots({
      events,
      startYmd: "2026-06-15",
      horizonDays: 1,
      durationMinutes: 60,
      timeZone: TZ,
      pref: "afternoon",
      maxSlots: 2,
    })
    expect(slots.length).toBeGreaterThanOrEqual(1)
    expect(new Date(slots[0].startAt).getUTCHours()).toBeGreaterThanOrEqual(13)
  })
})

describe("googleCalendarTemplateUrl", () => {
  it("builds a template URL with encoded dates", () => {
    const url = googleCalendarTemplateUrl("Entreno", "2026-06-15T14:00:00.000Z", "2026-06-15T15:00:00.000Z")
    expect(url).toContain("calendar.google.com")
    expect(url).toContain("action=TEMPLATE")
    expect(url).toContain("text=Entreno")
    expect(url).toContain("20260615T140000Z%2F20260615T150000Z")
  })
})
