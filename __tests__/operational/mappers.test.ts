import {
  mapOperationalTask,
  mapOperationalHabit,
  mapCheckin,
} from "@/lib/operational/mappers"

describe("operational mappers", () => {
  test("mapOperationalTask maps fields", () => {
    const mapped = mapOperationalTask({
      id: "t1",
      title: "Entrenar",
      completed: false,
      domain: "fisico",
      created_at: "2026-03-26T00:00:00Z",
    })
    expect(mapped).toEqual({
      id: "t1",
      title: "Entrenar",
      completed: false,
      domain: "fisico",
      created_at: "2026-03-26T00:00:00Z",
    })
  })

  test("mapOperationalHabit maps fields", () => {
    const mapped = mapOperationalHabit({
      id: "h1",
      name: "Hidratacion",
      completed: true,
      domain: "salud",
      created_at: "2026-03-26T00:00:00Z",
    })
    expect(mapped.name).toBe("Hidratacion")
  })

  test("mapCheckin maps fields", () => {
    const mapped = mapCheckin({
      id: "c1",
      score_global: 80,
      score_fisico: 70,
      score_salud: 90,
      score_profesional: 75,
      created_at: "2026-03-26T00:00:00Z",
    })
    expect(mapped.score_salud).toBe(90)
  })
})

