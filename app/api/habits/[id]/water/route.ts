import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { utcTodayIso } from "@/lib/habits/habitMetrics"
import { habitsMutationBlockedResponse } from "@/lib/habits/habitsMutationGate"
import {
  goalMlFromHabitMetadata,
  isWaterTrackingHabit,
} from "@/lib/habits/waterTrackingHelpers"
import { mapOperationalHabit, type OperationalHabitRow } from "@/lib/operational/mappers"

export const runtime = "nodejs"

/** Suma ml al día actual (o completedOn) para hábitos water-tracking. */
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
    const addRaw = body?.addMl
    const addMl = typeof addRaw === "number" && Number.isFinite(addRaw) ? Math.round(addRaw) : 0
    if (addMl <= 0 || addMl > 5000) {
      return NextResponse.json({ success: false, error: "addMl inválido (1–5000)" }, { status: 400 })
    }

    const rawDay = typeof body?.completedOn === "string" ? body.completedOn.trim() : ""
    const today = utcTodayIso()
    const targetDay = rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay.slice(0, 10) : today
    if (targetDay > today) {
      return NextResponse.json({ success: false, error: "No se registra agua en días futuros" }, { status: 400 })
    }

    const { data: habitRow, error: habitErr } = await supabase
      .from("operational_habits")
      .select("id,name,completed,domain,created_at,metadata")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (habitErr) throw habitErr
    if (!habitRow) {
      return NextResponse.json({ success: false, error: "Hábito no encontrado" }, { status: 404 })
    }

    const habit = mapOperationalHabit(habitRow as OperationalHabitRow)
    const meta = habit.metadata
    if (!isWaterTrackingHabit(meta)) {
      return NextResponse.json({ success: false, error: "Este hábito no es de tipo agua" }, { status: 400 })
    }

    const goal = goalMlFromHabitMetadata(meta)

    const { data: existing, error: findErr } = await supabase
      .from("habit_completions")
      .select("id,water_ml")
      .eq("habit_id", id)
      .eq("user_id", userId)
      .eq("completed_on", targetDay)
      .maybeSingle()

    if (findErr) throw findErr

    const prev = Math.max(0, existing?.water_ml ?? 0)
    const nextMl = Math.min(50000, prev + addMl)

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("habit_completions")
        .update({ water_ml: nextMl })
        .eq("id", existing.id)
      if (upErr) throw upErr
    } else {
      const { error: insErr } = await supabase.from("habit_completions").insert({
        user_id: userId,
        habit_id: id,
        completed_on: targetDay,
        water_ml: nextMl,
        notes: null,
      })
      if (insErr) throw insErr
    }

    const completedToday = targetDay === today && nextMl >= goal

    if (targetDay === today) {
      const { error: syncErr } = await supabase
        .from("operational_habits")
        .update({ completed: completedToday })
        .eq("id", id)
        .eq("user_id", userId)
      if (syncErr) throw syncErr
    }

    return NextResponse.json({
      success: true,
      data: {
        habit_id: id,
        completed_on: targetDay,
        water_ml: nextMl,
        water_goal_ml: goal,
        completed_today: completedToday,
        pct_of_goal: Math.min(100, Math.round((nextMl / goal) * 100)),
      },
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABIT WATER INCREMENT ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo registrar el agua" },
      { status: 500 },
    )
  }
}
