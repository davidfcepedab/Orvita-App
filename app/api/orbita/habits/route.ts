import { NextRequest, NextResponse } from "next/server"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import { deleteOrvitaHabit, listOrvitaHabits, upsertOrvitaHabit } from "@/lib/orbita/repositories/habitsRepo"
import type { OrvitaHabitFrequency } from "@/lib/orbita/models"

function resolveProfileId(req: NextRequest): AppProfileId {
  const param = req.nextUrl.searchParams.get("profileId")
  return isAppProfileId(param) ? param : resolveDefaultProfileId()
}

export async function GET(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const result = await listOrvitaHabits({ profileId })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error cargando hábitos", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const body = await req.json()

    const frequencyRaw = String(body.frequency || "daily").trim().toLowerCase()
    const frequency: OrvitaHabitFrequency = frequencyRaw === "weekly" ? "weekly" : "daily"

    const habit = {
      id: String(body.id || "").trim(),
      title: String(body.title || "").trim(),
      description: body.description ? String(body.description) : null,
      frequency,
      goal: Number(body.goal ?? 1) || 1,
      archived: Boolean(body.archived),
    }

    if (!habit.id || !habit.title) {
      return NextResponse.json({ success: false, error: "id y title son requeridos" }, { status: 400 })
    }

    const result = await upsertOrvitaHabit({ profileId, habit })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error guardando hábito", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const body = await req.json().catch(() => ({}))
    const id = String((body as any).id || req.nextUrl.searchParams.get("id") || "").trim()

    if (!id) return NextResponse.json({ success: false, error: "id es requerido" }, { status: 400 })

    const result = await deleteOrvitaHabit({ profileId, id })
    return NextResponse.json({ success: true, profileId, source: result.source })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error eliminando hábito", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}
