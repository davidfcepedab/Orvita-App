import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import type { OperationalDomain } from "@/lib/operational/types"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getGoogleAccessTokenForUser } from "@/lib/google/loadAccessToken"
import {
  insertPrimaryCalendarEventForTask,
  mapGoogleCalendarItem,
} from "@/lib/google/googleCalendarApi"
import { insertDefaultListTask, mapGoogleTask } from "@/lib/google/googleTasksApi"
import { createServiceClient } from "@/lib/supabase/server"

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
  assignment_accepted_at: string | null
}

/** Solo tareas creadas por el usuario o asignadas a él (agenda no compartida entre miembros del hogar). */
function agendaVisibilityOrFilter(userId: string) {
  return `user_id.eq.${userId},assignee_id.eq.${userId}`
}

function mapType(row: AgendaRow, currentUserId: string) {
  const assignee = row.assignee_id?.trim() || null
  const creator = (row.created_by ?? row.user_id)?.trim() || null

  if (assignee && assignee !== currentUserId) {
    if (creator === currentUserId) return "assigned"
    return "personal"
  }

  if (assignee === currentUserId && creator && creator !== currentUserId) {
    return "received"
  }

  return "personal"
}

const MOCK_AGENDA_USER_ID = "00000000-0000-0000-0000-0000000000aa"

function seedMockAgendaRows(): AgendaRow[] {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  return [
    {
      id: "mock-agenda-1",
      user_id: MOCK_AGENDA_USER_ID,
      title: "Revisar dashboard financiero",
      status: "pending",
      priority: "Alta",
      estimated_minutes: 25,
      due_date: today,
      assignee_id: null,
      assignee_name: null,
      created_by: MOCK_AGENDA_USER_ID,
      created_at: now,
      domain: "agenda",
      assignment_accepted_at: now,
    },
    {
      id: "mock-agenda-2",
      user_id: MOCK_AGENDA_USER_ID,
      title: "Preparar update semanal",
      status: "in-progress",
      priority: "Media",
      estimated_minutes: 40,
      due_date: today,
      assignee_id: null,
      assignee_name: null,
      created_by: MOCK_AGENDA_USER_ID,
      created_at: now,
      domain: "agenda",
      assignment_accepted_at: now,
    },
  ]
}

let mockAgendaRows: AgendaRow[] = seedMockAgendaRows()

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
    assignmentAcceptedAt: row.assignment_accepted_at ?? null,
    type: mapType(row, currentUserId),
  }
}

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        data: mockAgendaRows.map((row) => mapTask(row, MOCK_AGENDA_USER_ID)),
      })
    }

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
      .or(agendaVisibilityOrFilter(userId))
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
    if (isAppMockMode()) {
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
        return NextResponse.json({ success: false, error: "title es obligatorio" }, { status: 400 })
      }

      const now = new Date().toISOString()
      const assignedToOther =
        Boolean(assigneeId && String(assigneeId).trim()) &&
        String(assigneeId).trim() !== MOCK_AGENDA_USER_ID
      mockAgendaRows.unshift({
        id: `mock-agenda-${randomUUID()}`,
        user_id: MOCK_AGENDA_USER_ID,
        title,
        status: "pending",
        priority,
        estimated_minutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 30,
        due_date: dueDate,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        created_by: MOCK_AGENDA_USER_ID,
        created_at: now,
        domain: "agenda",
        assignment_accepted_at: assignedToOther ? null : now,
      })

      return NextResponse.json({ success: true, googleTask: null, googleSyncError: undefined })
    }

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
    const syncToGoogle = body?.syncToGoogle === true
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

    const assignedToOther =
      Boolean(assigneeId && String(assigneeId).trim()) && String(assigneeId).trim() !== userId

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
        completed: false,
        assignment_accepted_at: assignedToOther ? null : new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insert.error) {
      throw insert.error
    }

    const operationalId = insert.data.id as string

    let googleTask: { id: string; title: string } | null = null
    let googleSyncError: string | null = null
    let googleCalendarEvent: { id: string } | null = null
    let googleCalendarSyncError: string | null = null

    if (syncToGoogle && isSupabaseEnabled()) {
      const tokenResult = await getGoogleAccessTokenForUser(supabase, userId)
      if ("error" in tokenResult) {
        googleSyncError = tokenResult.error
      } else {
        const token = tokenResult.token
        try {
          const created = await insertDefaultListTask(token, {
            title,
            due: dueDate,
          })
          const mapped = mapGoogleTask(created)
          if (mapped) {
            googleTask = { id: mapped.id, title: mapped.title }
            const now = new Date().toISOString()
            await supabase.from("external_tasks").upsert(
              {
                user_id: userId,
                google_task_id: mapped.id,
                title: mapped.title,
                status: mapped.status,
                due_date: mapped.due,
                raw: created as Record<string, unknown>,
                synced_at: now,
                deleted_at: null,
              },
              { onConflict: "user_id,google_task_id" },
            )
            await supabase
              .from("operational_tasks")
              .update({ google_task_id: mapped.id })
              .eq("id", operationalId)
              .eq("user_id", userId)
          }
        } catch (e) {
          googleSyncError = e instanceof Error ? e.message : "Google sync failed"
        }

        try {
          const calRaw = await insertPrimaryCalendarEventForTask(token, {
            title,
            dueDate,
            estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 30,
          })
          const mappedCal = mapGoogleCalendarItem(calRaw)
          if (mappedCal) {
            googleCalendarEvent = { id: mappedCal.id }
            const now = new Date().toISOString()
            const db = createServiceClient()
            await db.from("external_calendar_events").upsert(
              {
                user_id: userId,
                google_event_id: mappedCal.id,
                summary: mappedCal.summary,
                start_at: mappedCal.startAt,
                end_at: mappedCal.endAt,
                raw: calRaw as Record<string, unknown>,
                synced_at: now,
                deleted_at: null,
              },
              { onConflict: "user_id,google_event_id" },
            )
            await db
              .from("operational_tasks")
              .update({ google_calendar_event_id: mappedCal.id })
              .eq("id", operationalId)
              .eq("user_id", userId)
          }
        } catch (e) {
          googleCalendarSyncError = e instanceof Error ? e.message : "Google Calendar sync failed"
        }
      }
    }

    return NextResponse.json({
      success: true,
      googleTask,
      googleSyncError: googleSyncError ?? undefined,
      googleCalendarEvent,
      googleCalendarSyncError: googleCalendarSyncError ?? undefined,
    })
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
    if (isAppMockMode()) {
      const body = await req.json()
      const id = String(body?.id || "").trim()
      if (!id) {
        return NextResponse.json({ success: false, error: "id es obligatorio" }, { status: 400 })
      }

      const idx = mockAgendaRows.findIndex((r) => r.id === id)
      if (idx === -1) {
        return NextResponse.json({ success: false, error: "Tarea no encontrada" }, { status: 404 })
      }

      const row = mockAgendaRows[idx]
      if (typeof body.title === "string") row.title = body.title.trim()
      if (body.status === "pending" || body.status === "in-progress" || body.status === "completed") {
        row.status = body.status
      }
      if (body.priority === "Alta" || body.priority === "Media" || body.priority === "Baja") {
        row.priority = body.priority
      }
      if (typeof body.estimatedMinutes === "number") {
        row.estimated_minutes = body.estimatedMinutes
      }
      if (body.dueDate === null || typeof body.dueDate === "string") {
        row.due_date = body.dueDate
      }
      if (body.assigneeId === null || typeof body.assigneeId === "string") {
        row.assignee_id = body.assigneeId
      }
      if (body.assigneeName === null || typeof body.assigneeName === "string") {
        row.assignee_name = body.assigneeName
      }
      if (body.acceptAssignment === true) {
        row.assignment_accepted_at = new Date().toISOString()
      }

      return NextResponse.json({ success: true })
    }

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

    if (body.acceptAssignment === true) {
      const sel = await supabase
        .from("operational_tasks")
        .select("id, assignee_id, created_by, assignment_accepted_at")
        .eq("id", id)
        .eq("domain", "agenda")
        .eq("household_id", householdId)
        .maybeSingle()

      if (sel.error) {
        throw sel.error
      }
      const taskRow = sel.data as {
        assignee_id: string | null
        created_by: string | null
        assignment_accepted_at: string | null
      } | null
      if (!taskRow) {
        return NextResponse.json({ success: false, error: "Tarea no encontrada" }, { status: 404 })
      }
      if (taskRow.assignee_id?.trim() !== userId) {
        return NextResponse.json(
          { success: false, error: "Solo el asignatario puede aceptar la tarea" },
          { status: 403 }
        )
      }
      if (!taskRow.created_by || taskRow.created_by === userId) {
        return NextResponse.json(
          { success: false, error: "Esta tarea no requiere aceptación" },
          { status: 400 }
        )
      }
      if (taskRow.assignment_accepted_at) {
        return NextResponse.json({ success: true })
      }

      const acc = await supabase
        .from("operational_tasks")
        .update({ assignment_accepted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("domain", "agenda")
        .eq("household_id", householdId)
        .eq("assignee_id", userId)
        .select("id")
        .maybeSingle()

      if (acc.error) {
        throw acc.error
      }
      if (!acc.data) {
        return NextResponse.json({ success: false, error: "Tarea no encontrada" }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    const patch: Record<string, unknown> = {}
    if (typeof body.title === "string") patch.title = body.title.trim()
    if (body.status === "pending" || body.status === "in-progress" || body.status === "completed") {
      patch.status = body.status
      patch.completed = body.status === "completed"
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
      .or(agendaVisibilityOrFilter(userId))
      .select("id")

    if (update.error) {
      throw update.error
    }
    if (!update.data?.length) {
      return NextResponse.json(
        { success: false, error: "Tarea no encontrada o sin permiso" },
        { status: 404 },
      )
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

export async function DELETE(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      const body = await req.json()
      const id = String(body?.id || "").trim()
      if (!id) {
        return NextResponse.json({ success: false, error: "id es obligatorio" }, { status: 400 })
      }
      mockAgendaRows = mockAgendaRows.filter((r) => r.id !== id)
      return NextResponse.json({ success: true })
    }

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

    const del = await supabase
      .from("operational_tasks")
      .delete()
      .eq("id", id)
      .eq("domain", "agenda")
      .eq("household_id", householdId)
      .or(agendaVisibilityOrFilter(userId))
      .select("id")

    if (del.error) {
      throw del.error
    }
    if (!del.data?.length) {
      return NextResponse.json(
        { success: false, error: "Tarea no encontrada o sin permiso" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json(
      { success: false, error: `No se pudo borrar la tarea: ${detail}` },
      { status: 500 }
    )
  }
}
