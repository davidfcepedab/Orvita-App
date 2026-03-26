import { buildOperationalContext } from "@/lib/operational/context"

describe("buildOperationalContext", () => {
  test("builds defaults when no checkin is present", () => {
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: null,
    })

    expect(context.score_global).toBe(0)
    expect(context.today_tasks).toHaveLength(0)
    expect(context.habits).toHaveLength(0)
  })

  test("uses checkin scores when present", () => {
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: {
        id: "c1",
        score_global: 80,
        score_fisico: 70,
        score_salud: 90,
        score_profesional: 60,
        created_at: "2026-03-26T00:00:00Z",
      },
    })

    expect(context.score_global).toBe(80)
    expect(context.score_salud).toBe(90)
    expect(context.score_disciplina).toBe(60)
  })

  test("computes global score when missing", () => {
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: {
        id: "c2",
        score_global: null,
        score_fisico: 60,
        score_salud: 90,
        score_profesional: 30,
        created_at: "2026-03-26T00:00:00Z",
      },
    })

    expect(context.score_global).toBe(60)
  })
})
