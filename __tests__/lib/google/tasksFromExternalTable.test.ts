import { externalTaskRowToDto } from "@/lib/google/tasksFromExternalTable"

describe("externalTaskRowToDto", () => {
  test("mapea due_date", () => {
    const dto = externalTaskRowToDto({
      google_task_id: "t1",
      title: "Hola",
      status: "needsAction",
      due_date: "2026-04-10T12:00:00.000Z",
    })
    expect(dto.id).toBe("t1")
    expect(dto.title).toBe("Hola")
    expect(dto.due).toContain("2026-04-10")
  })
})
