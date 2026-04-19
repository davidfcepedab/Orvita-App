import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { buildOperationalContext } from "@/lib/operational/context"
import {
  mapCheckin,
  mapOperationalHabit,
  mapOperationalTask,
  type CheckinRow,
  type OperationalHabitRow,
  type OperationalTaskRow,
} from "@/lib/operational/mappers"

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      const now = new Date().toISOString()
      const data = buildOperationalContext({
        tasks: [
          {
            id: "mock-ctx-task-1",
            title: "Bloque de trabajo profundo",
            completed: false,
            domain: "profesional",
            created_at: now,
          },
          {
            id: "mock-ctx-task-2",
            title: "Sincronización con equipo",
            completed: false,
            domain: "agenda",
            created_at: now,
          },
        ],
        habits: [
          {
            id: "mock-ctx-habit-1",
            name: "Movilidad matutina",
            completed: false,
            domain: "fisico",
            created_at: now,
          },
        ],
        latestCheckin: null,
      })
      return NextResponse.json({
        success: true,
        data: {
          ...data,
          next_action: "Completar propuesta para cliente",
          next_impact: "Alto impacto en pipeline",
          next_time_required: "120 min",
          current_block: "Profesional",
          command_focus_domain: "profesional",
          next_task_id: undefined,
        },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const { data: tasks, error: taskError } = await supabase
      .from("operational_tasks")
      .select("id,title,completed,domain,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (taskError) throw taskError

    const { data: habits, error: habitError } = await supabase
      .from("operational_habits")
      .select("id,name,completed,domain,created_at,metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (habitError) throw habitError

    const { data: recentCheckinRows, error: checkinError } = await supabase
      .from("checkins")
      .select("id,score_global,score_fisico,score_salud,score_profesional,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(7)

    if (checkinError) throw checkinError

    const recentCheckinsDesc = (recentCheckinRows ?? []).map((row) => mapCheckin(row as CheckinRow))
    const latestCheckin = recentCheckinsDesc[0] ?? null

    const context = buildOperationalContext({
      tasks: (tasks ?? []).map((row) => mapOperationalTask(row as OperationalTaskRow)),
      habits: (habits ?? []).map((row) => mapOperationalHabit(row as OperationalHabitRow)),
      latestCheckin,
      recentCheckinsDesc,
    })

    return NextResponse.json({ success: true, data: context })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("CONTEXT ERROR:", detail)

    return NextResponse.json(
      { success: false, error: "Error cargando contexto" },
      { status: 500 }
    )
  }
}

