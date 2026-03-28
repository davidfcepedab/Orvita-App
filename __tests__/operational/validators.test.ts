import {
  parseTaskCreate,
  parseTaskPatch,
  parseHabitCreate,
  parseHabitPatch,
  parseCheckinCreate,
} from "@/lib/operational/validators"

describe("operational validators", () => {
  test("parseTaskCreate requires title and domain", () => {
    expect(parseTaskCreate({ title: "", domain: "salud" })).toHaveProperty("error")
    expect(parseTaskCreate({ title: "Run", domain: "salud" })).toMatchObject({
      title: "Run",
      domain: "salud",
      completed: false,
    })
  })

  test("parseTaskPatch requires id and changes", () => {
    expect(parseTaskPatch({})).toHaveProperty("error")
    expect(parseTaskPatch({ id: "123" })).toHaveProperty("error")
    expect(parseTaskPatch({ id: "123", completed: true })).toMatchObject({
      id: "123",
    })
  })

  test("parseHabitCreate requires name and domain", () => {
    expect(parseHabitCreate({ name: "Hidratacion", domain: "fisico" })).toMatchObject({
      name: "Hidratacion",
      domain: "fisico",
      completed: false,
      metadata: {},
    })
  })

  test("parseHabitPatch requires id and changes", () => {
    expect(parseHabitPatch({ id: "h1", completed: true })).toMatchObject({ id: "h1" })
  })

  test("parseCheckinCreate requires at least one score", () => {
    expect(parseCheckinCreate({})).toHaveProperty("error")
    expect(parseCheckinCreate({ score_global: 80 })).toMatchObject({
      score_global: 80,
    })
  })
})

