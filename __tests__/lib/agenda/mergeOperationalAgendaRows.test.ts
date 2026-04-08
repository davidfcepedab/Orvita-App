import { mergeAgendaRowsById } from "@/lib/agenda/mergeOperationalAgendaRows"

describe("mergeAgendaRowsById", () => {
  it("dedupes by id and sorts by created_at desc", () => {
    const a = [
      {
        id: "1",
        user_id: "u1",
        created_at: "2025-01-01T00:00:00.000Z",
        domain: "agenda" as const,
      },
      {
        id: "2",
        user_id: "u1",
        created_at: "2025-01-03T00:00:00.000Z",
        domain: "agenda" as const,
      },
    ]
    const b = [
      {
        id: "2",
        user_id: "u1",
        created_at: "2025-01-03T00:00:00.000Z",
        domain: "agenda" as const,
      },
      {
        id: "3",
        user_id: "u1",
        created_at: "2025-01-02T00:00:00.000Z",
        domain: "agenda" as const,
      },
    ]
    const out = mergeAgendaRowsById(a, b)
    expect(out.map((r) => r.id)).toEqual(["2", "3", "1"])
  })
})
