import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const CURRENT_USER_ID = "david"
const CURRENT_USER_NAME = "Commander"

type AgendaRow = {
  id: string
  title: string
  status: "pending" | "in-progress" | "completed"
  priority: "Alta" | "Media" | "Baja"
  estimated_minutes: number
  due_date: string | null
  assignee_id: string | null
  assignee_name: string | null
  created_by: string
  created_at: string
}

function mapType(row: AgendaRow) {
  if (!row.assignee_id || row.assignee_id === CURRENT_USER_ID) return "personal"
  if (row.created_by === CURRENT_USER_ID) return "assigned"
  return "received"
}

function mapTask(row: AgendaRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    estimatedMinutes: row.estimated_minutes,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    type: mapType(row),
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const result = await supabase
      .from("orbita_agenda_tasks")
      .select("*")
      .order("created_at", { ascending: false })

    if (result.error) {
      throw result.error
    }

    const rows = (result.data || []) as AgendaRow[]
    return NextResponse.json({
      success: true,
      data: rows.map(mapTask),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json(
      { success: false, error: `No se pudo cargar agenda: ${detail}` },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const title = String(body?.title || "").trim()
    const priority = body?.priority === "Alta" || body?.priority === "Media" || body?.priority === "Baja"
      ? body.priority
      : "Media"
    const estimatedMinutes = Number(body?.estimatedMinutes || 30)
    const dueDate = body?.dueDate ? String(body.dueDate) : null
    const assigneeId = body?.assigneeId ? String(body.assigneeId) : null
    const assigneeName = body?.assigneeName ? String(body.assigneeName) : null

    if (!title) {
      return NextResponse.json(
        { success: false, error: "title es obligatorio" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const insert = await supabase
      .from("orbita_agenda_tasks")
      .insert({
        id: crypto.randomUUID(),
        title,
        status: "pending",
        priority,
        estimated_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 30,
        due_date: dueDate,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        created_by: CURRENT_USER_ID,
      })

    if (insert.error) {
      throw insert.error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json(
      { success: false, error: `No se pudo crear tarea: ${detail}` },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const id = String(body?.id || "").trim()
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id es obligatorio" },
        { status: 400 }
      )
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.title === "string") patch.title = body.title.trim()
    if (body.status === "pending" || body.status === "in-progress" || body.status === "completed") {
      patch.status = body.status
    }
    if (body.priority === "Alta" || body.priority === "Media" || body.priority === "Baja") {
      patch.priority = body.priority
    }
    if (typeof body.estimatedMinutes === "number") {
      patch.estimated_minutes = body.estimatedMinutes
    }
    if (body.dueDate === null || typeof body.dueDate === "string") {
      patch.due_date = body.dueDate
    }
    if (body.assigneeId === null || typeof body.assigneeId === "string") {
      patch.assignee_id = body.assigneeId
    }
    if (body.assigneeName === null || typeof body.assigneeName === "string") {
      patch.assignee_name = body.assigneeName
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay cambios para aplicar" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()
    const update = await supabase
      .from("orbita_agenda_tasks")
      .update(patch)
      .eq("id", id)

    if (update.error) {
      throw update.error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json(
      { success: false, error: `No se pudo actualizar tarea: ${detail}` },
      { status: 500 }
    )
  }
}
