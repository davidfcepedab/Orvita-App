import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
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
      .select("id,name,completed,domain,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (habitError) throw habitError

    const { data: latestCheckin, error: checkinError } = await supabase
      .from("checkins")
      .select("id,score_global,score_fisico,score_salud,score_profesional,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (checkinError) throw checkinError

    const context = buildOperationalContext({
      tasks: (tasks ?? []).map((row) => mapOperationalTask(row as OperationalTaskRow)),
      habits: (habits ?? []).map((row) => mapOperationalHabit(row as OperationalHabitRow)),
      latestCheckin: latestCheckin
        ? mapCheckin(latestCheckin as CheckinRow)
        : null,
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
