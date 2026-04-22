import { buildOperationalContext } from "@/lib/operational/context"
import type { AppleHealthContextSignals, Checkin } from "@/lib/operational/types"

describe("buildOperationalContext", () => {
  test("builds defaults when no checkin is present", () => {
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: null,
    })

    expect(context.score_global).toBe(0)
    expect(context.apple_health).toBeNull()
    expect(context.today_tasks).toHaveLength(0)
    expect(context.habits).toHaveLength(0)
    expect(context.next_action).toMatch(/movimiento ejecutable/i)
    expect(context.next_task_id).toBeUndefined()
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
    expect(context.next_action).toMatch(/movimiento ejecutable/i)
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

  test("fills tendencia_7d from recentCheckinsDesc (chronological salud scores)", () => {
    const recentDesc: Checkin[] = [
      {
        id: "c-new",
        score_global: null,
        score_fisico: 55,
        score_salud: 60,
        score_profesional: 55,
        created_at: "2026-01-02T08:00:00.000Z",
      },
      {
        id: "c-old",
        score_global: null,
        score_fisico: 50,
        score_salud: 40,
        score_profesional: 50,
        created_at: "2026-01-01T08:00:00.000Z",
      },
    ]
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: recentDesc[0]!,
      recentCheckinsDesc: recentDesc,
    })

    expect(context.tendencia_7d).toHaveLength(2)
    expect(context.tendencia_7d[0]?.value).toBe(40)
    expect(context.tendencia_7d[1]?.value).toBe(60)
    expect(context.delta_recuperacion).toBe(20)
  })

  test("derives command focus from first open task by domain priority", () => {
    const context = buildOperationalContext({
      tasks: [
        {
          id: "t-agenda",
          title: "Revisar bandeja",
          completed: false,
          domain: "agenda",
          created_at: "2026-03-26T12:00:00Z",
        },
        {
          id: "t-pro",
          title: "Cerrar informe",
          completed: false,
          domain: "profesional",
          created_at: "2026-03-26T11:00:00Z",
        },
      ],
      habits: [],
      latestCheckin: null,
    })

    expect(context.next_action).toBe("Cerrar informe")
    expect(context.next_task_id).toBe("t-pro")
    expect(context.command_focus_domain).toBe("profesional")
    expect(context.current_block).toBe("Profesional")
  })

  test("merges Apple Health insights when latest metrics are present", () => {
    const apple: AppleHealthContextSignals = {
      observed_at: new Date().toISOString(),
      source: "apple_health_export",
      sleep_hours: 5.1,
      hrv_ms: 40,
      readiness_score: 70,
      steps: 8000,
      calories: 500,
      energy_index: 70,
      workouts_count: 0,
      workout_minutes: null,
      resting_hr_bpm: null,
      sync_stale: false,
    }
    const context = buildOperationalContext({
      tasks: [],
      habits: [],
      latestCheckin: {
        id: "c-apple",
        score_global: 78,
        score_fisico: 75,
        score_salud: 80,
        score_profesional: 60,
        created_at: "2026-03-26T00:00:00Z",
      },
      appleHealthLatest: apple,
    })

    expect(context.apple_health?.sleep_hours).toBe(5.1)
    expect(context.insights.some((line) => /sueño/i.test(line))).toBe(true)
  })
})
