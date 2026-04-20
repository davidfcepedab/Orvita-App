import { NextRequest, NextResponse } from "next/server"
import { requireUser, type AuthedRequest } from "@/lib/api/requireUser"
import {
  addDaysIso,
  aggregateHabitsSummary,
  computeHabitCompletionMetrics,
  utcTodayIso,
} from "@/lib/habits/habitMetrics"
import { habitsMutationBlockedResponse } from "@/lib/habits/habitsMutationGate"
import {
  mapOperationalHabit,
  type OperationalHabitRow,
} from "@/lib/operational/mappers"
import type { HabitWithMetrics } from "@/lib/operational/types"
import {
  parseHabitCreate,
  parseHabitPatch,
} from "@/lib/operational/validators"
import {
  DEFAULT_WATER_HABIT_METADATA,
  deriveHabitCompletionDates,
  isWaterTrackingHabit,
  waterMlForDay,
} from "@/lib/habits/waterTrackingHelpers"

export const runtime = "nodejs"

async function ensureDefaultWaterHabit(
  supabase: AuthedRequest["supabase"],
  userId: string,
): Promise<void> {
  const { data: habitRows, error: listErr } = await supabase
    .from("operational_habits")
    .select("metadata")
    .eq("user_id", userId)
  if (listErr) throw listErr
  const hasWater = (habitRows ?? []).some((r: { metadata?: unknown }) => {
    const m = r.metadata as { habit_type?: string } | null | undefined
    return m?.habit_type === "water-tracking"
  })
  if (hasWater) return

  const { error: insErr } = await supabase.from("operational_habits").insert({
    user_id: userId,
    name: "Hidratación Estratégica",
    completed: false,
    domain: "salud",
    metadata: DEFAULT_WATER_HABIT_METADATA,
  })
  if (insErr) throw insErr
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const legacy = req.nextUrl.searchParams.get("legacy") === "1"
    const domain = req.nextUrl.searchParams.get("domain")

    await ensureDefaultWaterHabit(supabase, userId)

    const query = supabase
      .from("operational_habits")
      .select("id,name,completed,domain,created_at,metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (domain) query.eq("domain", domain)

    const { data: rows, error } = await query
    if (error) throw error

    const list = rows ?? []

    if (legacy) {
      const habits = list.map((row) => mapOperationalHabit(row as OperationalHabitRow))
      return NextResponse.json({ success: true, data: habits, legacy: true })
    }

    const todayIso = utcTodayIso()
    const cutoff = addDaysIso(todayIso, -400)
    const habitIds = list.map((r) => r.id)

    type CompletionRow = { habit_id: string; completed_on: string; water_ml: number | null }
    let completions: CompletionRow[] = []
    if (habitIds.length > 0) {
      const { data: comp, error: compError } = await supabase
        .from("habit_completions")
        .select("habit_id,completed_on,water_ml")
        .eq("user_id", userId)
        .in("habit_id", habitIds)
        .gte("completed_on", cutoff)

      if (compError) throw compError
      completions = (comp ?? []) as CompletionRow[]
    }

    const rowsByHabit = new Map<string, CompletionRow[]>()
    for (const row of completions) {
      const arr = rowsByHabit.get(row.habit_id) ?? []
      arr.push(row)
      rowsByHabit.set(row.habit_id, arr)
    }

    const habits: HabitWithMetrics[] = list.map((row) => {
      const habit = mapOperationalHabit(row as OperationalHabitRow)
      const rawRows = rowsByHabit.get(row.id) ?? []
      const dates = deriveHabitCompletionDates(habit.metadata ?? null, rawRows)
      const metrics = computeHabitCompletionMetrics(dates, todayIso, habit.metadata ?? null)
      const water_today_ml = isWaterTrackingHabit(habit.metadata)
        ? waterMlForDay(rawRows, todayIso)
        : undefined
      return { ...habit, metrics, ...(water_today_ml !== undefined ? { water_today_ml } : {}) }
    })

    const summary = aggregateHabitsSummary(habits.map((h) => h.metrics))

    return NextResponse.json({
      success: true,
      data: { habits, summary },
      legacy: false,
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABITS GET ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo cargar habitos" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const blocked = habitsMutationBlockedResponse()
    if (blocked) return blocked

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const body = await req.json()
    const parsed = parseHabitCreate(body)
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("operational_habits")
      .insert({
        user_id: userId,
        name: parsed.name,
        completed: parsed.completed,
        domain: parsed.domain,
        metadata: parsed.metadata,
      })
      .select("id,name,completed,domain,created_at,metadata")
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: mapOperationalHabit(data as OperationalHabitRow),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABITS POST ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo crear habito" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const blocked = habitsMutationBlockedResponse()
    if (blocked) return blocked

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const body = await req.json()
    const parsed = parseHabitPatch(body)
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("operational_habits")
      .update(parsed.patch)
      .eq("id", parsed.id)
      .eq("user_id", userId)
      .select("id,name,completed,domain,created_at,metadata")
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: mapOperationalHabit(data as OperationalHabitRow),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABITS PATCH ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo actualizar habito" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const blocked = habitsMutationBlockedResponse()
    if (blocked) return blocked

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === "string" ? body.id.trim() : ""
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("operational_habits")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("HABITS DELETE ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo eliminar habito" },
      { status: 500 }
    )
  }
}

