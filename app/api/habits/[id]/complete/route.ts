import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { parseBackfillCompletionDay, utcTodayIso } from "@/lib/habits/habitMetrics"
import { habitsMutationBlockedResponse } from "@/lib/habits/habitsMutationGate"

export const runtime = "nodejs"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const blocked = habitsMutationBlockedResponse()
    if (blocked) return blocked

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const { id: habitId } = await ctx.params
    const id = habitId?.trim()
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 2000) : null
    const rawCompletedOn = typeof body?.completedOn === "string" ? body.completedOn.trim() : ""

    const today = utcTodayIso()
    let targetDay: string
    if (!rawCompletedOn) {
      targetDay = today
    } else {
      const parsed = parseBackfillCompletionDay(rawCompletedOn)
      if (!parsed.ok) {
        return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      }
      targetDay = parsed.day
    }

    const { data: habit, error: habitError } = await supabase
      .from("operational_habits")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (habitError) throw habitError
    if (!habit) {
      return NextResponse.json({ success: false, error: "Hábito no encontrado" }, { status: 404 })
    }

    const { data: existing, error: findError } = await supabase
      .from("habit_completions")
      .select("id")
      .eq("habit_id", id)
      .eq("user_id", userId)
      .eq("completed_on", targetDay)
      .maybeSingle()

    if (findError) throw findError

    let markedOnTargetDay: boolean

    if (existing?.id) {
      const { error: delError } = await supabase.from("habit_completions").delete().eq("id", existing.id)
      if (delError) throw delError
      markedOnTargetDay = false
    } else {
      const { error: insError } = await supabase.from("habit_completions").insert({
        user_id: userId,
        habit_id: id,
        completed_on: targetDay,
        notes: notes || null,
      })
      if (insError) throw insError
      markedOnTargetDay = true
    }

    const { data: todayRow, error: todayErr } = await supabase
      .from("habit_completions")
      .select("id")
      .eq("habit_id", id)
      .eq("user_id", userId)
      .eq("completed_on", today)
      .maybeSingle()

    if (todayErr) throw todayErr

    const completedToday = Boolean(todayRow?.id)

    const { error: syncError } = await supabase
      .from("operational_habits")
      .update({ completed: completedToday })
      .eq("id", id)
      .eq("user_id", userId)

    if (syncError) throw syncError

    return NextResponse.json({
      success: true,
      data: {
        habit_id: id,
        completed_on: targetDay,
        marked_on_that_day: markedOnTargetDay,
        completed_today: completedToday,
      },
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABIT COMPLETE ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo actualizar el completado" },
      { status: 500 },
    )
  }
}
