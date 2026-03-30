import {
  googleTasksForTimelineMerge,
  googleTasksWithDueForDayIndex,
  upcomingGoogleReminders,
} from "@/lib/agenda/googleTasksUpcoming"
import type { GoogleTaskDTO } from "@/lib/google/types"

describe("googleTasksWithDueForDayIndex", () => {
  const tasks: GoogleTaskDTO[] = [
    { id: "1", title: "Futura", status: "needsAction", due: "2026-12-01T00:00:00.000Z" },
    { id: "2", title: "Atrasada", status: "needsAction", due: "2025-01-01T00:00:00.000Z" },
    { id: "3", title: "Hecha", status: "completed", due: "2026-06-01T00:00:00.000Z" },
    { id: "4", title: "Sin fecha", status: "needsAction", due: null },
  ]

  test("incluye vencidas y futuras; excluye completadas y sin due", () => {
    const out = googleTasksWithDueForDayIndex(tasks)
    expect(out.map((t) => t.id).sort()).toEqual(["1", "2"])
  })

  test("ordena por fecha de vencimiento", () => {
    const out = googleTasksWithDueForDayIndex(tasks)
    expect(out[0].id).toBe("2")
    expect(out[1].id).toBe("1")
  })
})

describe("upcomingGoogleReminders vs índice calendario", () => {
  test("ventana corta excluye futuras lejanas que el índice calendario sí incluye", () => {
    const far: GoogleTaskDTO = {
      id: "far",
      title: "Lejana",
      status: "needsAction",
      due: "2027-06-15T00:00:00.000Z",
    }
    const upcoming = upcomingGoogleReminders([far], 14, 48)
    const indexed = googleTasksWithDueForDayIndex([far])
    expect(upcoming).toHaveLength(0)
    expect(indexed).toHaveLength(1)
  })
})

describe("googleTasksForTimelineMerge", () => {
  test("añade sin fecha al final", () => {
    const list: GoogleTaskDTO[] = [
      { id: "d", title: "D", status: "needsAction", due: "2026-03-10T00:00:00.000Z" },
      { id: "u", title: "U", status: "needsAction", due: null },
    ]
    const merged = googleTasksForTimelineMerge(list)
    expect(merged[merged.length - 1].id).toBe("u")
  })
})
