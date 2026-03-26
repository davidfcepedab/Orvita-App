import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // =============================
    // 1️⃣ Load profile-scoped data
    // =============================

    const { data: tasks } = await supabase
      .from("orbita_tasks")
      .select("id,title,priority,due_at,status")
      .eq("status", "pending")
      .order("due_at", { ascending: true })

    const { data: habits } = await supabase
      .from("orbita_habits")
      .select("id,title,scheduled_days,current_streak,best_streak,archived_at")
      .is("archived_at", null)

    const { data: latestCheckin } = await supabase
      .from("orbita_daily_checkins_summary")
      .select("energy,focus,mood,updated_at")
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle()

    // =============================
    // 2️⃣ Derive scores safely
    // =============================

    const score_recuperacion = latestCheckin?.energy ?? 0
    const score_disciplina = latestCheckin?.focus ?? 0
    const score_global =
      typeof latestCheckin?.energy === "number" &&
      typeof latestCheckin?.focus === "number"
        ? Math.round((latestCheckin.energy + latestCheckin.focus) / 2)
        : 0

    // =============================
    // 3️⃣ Response (clean contract)
    // =============================

    return NextResponse.json({
      today_tasks: tasks ?? [],
      habits: habits ?? [],

      score_global,
      score_disciplina,
      score_recuperacion,

      delta_global: 0,
      delta_disciplina: 0,
      delta_recuperacion: 0,
      delta_tendencia: 0,

      tendencia_7d: [],
      prediction: null,
      insights: [],
    })
  } catch (error: any) {
    console.error("CONTEXT ERROR:", error?.message)

    return NextResponse.json(
      { error: "Error cargando contexto" },
      { status: 500 }
    )
  }
}
