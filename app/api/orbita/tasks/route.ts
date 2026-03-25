import { NextRequest, NextResponse } from "next/server"
import { isAppProfileId, resolveDefaultProfileId, type AppProfileId } from "@/lib/config/profiles"
import { deleteOrvitaTask, listOrvitaTasks, upsertOrvitaTask } from "@/lib/orbita/repositories/tasksRepo"
import type { OrvitaTaskStatus } from "@/lib/orbita/models"

function resolveProfileId(req: NextRequest): AppProfileId {
  const param = req.nextUrl.searchParams.get("profileId")
  return isAppProfileId(param) ? param : resolveDefaultProfileId()
}

export async function GET(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const result = await listOrvitaTasks({ profileId })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error cargando tasks", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const profileId = resolveProfileId(req)
    const body = await req.json()

    const statusRaw = String(body.status || "pending").trim().toLowerCase()
    const status: OrvitaTaskStatus =
      statusRaw === "in_progress" ? "in_progress" :
        statusRaw === "completed" ? "completed" :
          statusRaw === "cancelled" || statusRaw === "canceled" ? "cancelled" :
            "pending"

    const task = {
      id: String(body.id || "").trim(),
      title: String(body.title || "").trim(),
      description: body.description ? String(body.description) : null,
      status,
      priority: Number(body.priority ?? 0) || 0,
      dueAt: body.dueAt ? String(body.dueAt) : null,
      projectId: body.projectId ? String(body.projectId) : null,
      archived: Boolean(body.archived),
    }

    if (!task.id || !task.title) {
      return NextResponse.json({ success: false, error: "id y title son requeridos" }, { status: 400 })
    }

    const result = await upsertOrvitaTask({ profileId, task })
    return NextResponse.json({ success: true, profileId, source: result.source, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error guardando task", detail: error?.message ?? "unknown_error" },
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

    const result = await deleteOrvitaTask({ profileId, id })
    return NextResponse.json({ success: true, profileId, source: result.source })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Error eliminando task", detail: error?.message ?? "unknown_error" },
      { status: 500 }
    )
  }
}
