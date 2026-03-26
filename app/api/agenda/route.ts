import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import type { OperationalDomain } from "@/lib/operational/types"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

type AgendaRow = {
  id: string
  user_id: string | null
  title: string
  status: "pending" | "in-progress" | "completed"
  priority: "Alta" | "Media" | "Baja"
  estimated_minutes: number
  due_date: string | null
  assignee_id: string | null
  assignee_name: string | null
  created_by: string | null
  created_at: string
  domain: OperationalDomain
}

function mapType(row: AgendaRow, currentUserId: string) {
  if (!row.assignee_id || row.assignee_id === currentUserId) return "personal"
  if (row.created_by === currentUserId || row.user_id === currentUserId) return "assigned"
  return "received"
}

function mapTask(row: AgendaRow, currentUserId: string) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    estimatedMinutes: row.estimated_minutes,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    createdBy: row.created_by ?? row.user_id,
    createdAt: row.created_at,
    type: mapType(row, currentUserId),
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth
    const householdId = await getHouseholdId(supabase, userId)
    if (!householdId) {
      return NextResponse.json(
        { success: false, error: "Usuario sin hogar asignado" },
        { status: 403 }
      )
    }
    const result = await supabase
      .from("operational_tasks")
      .select("*")
      .eq("domain", "agenda")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })

    if (result.error) {
      throw result.error
    }

    const rows = (result.data || []) as AgendaRow[]
    return NextResponse.json({
      success: true,
      data: rows.map((row) => mapTask(row, userId)),
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
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth
    const householdId = await getHouseholdId(supabase, userId)
    if (!householdId) {
      return NextResponse.json(
        { success: false, error: "Usuario sin hogar asignado" },
        { status: 403 }
      )
    }
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

    const insert = await supabase
      .from("operational_tasks")
      .insert({
        user_id: userId,
        household_id: householdId,
        title,
        status: "pending",
        priority,
        estimated_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 30,
        due_date: dueDate,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        created_by: userId,
        domain: "agenda",
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
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth
    const householdId = await getHouseholdId(supabase, userId)
    if (!householdId) {
      return NextResponse.json(
        { success: false, error: "Usuario sin hogar asignado" },
        { status: 403 }
      )
    }
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

    const update = await supabase
      .from("operational_tasks")
      .update(patch)
      .eq("id", id)
      .eq("domain", "agenda")
      .eq("household_id", householdId)

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
