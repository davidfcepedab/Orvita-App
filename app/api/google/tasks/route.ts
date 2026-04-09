import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  API_GOOGLE_MUTATION_NO_SYNC,
  isAppMockMode,
  isSupabaseEnabled,
  UI_GOOGLE_TASKS_OFF,
} from "@/lib/checkins/flags"
import {
  deleteDefaultListTask,
  fetchDefaultTaskList,
  insertDefaultListTask,
  mapGoogleTask,
  patchDefaultListTask,
} from "@/lib/google/googleTasksApi"
import {
  fetchExternalTaskDtoByGoogleId,
  fetchTasksFromExternalTable,
} from "@/lib/google/tasksFromExternalTable"
import { getGoogleAccessTokenForUser } from "@/lib/google/loadAccessToken"
import { MOCK_GOOGLE_TASKS } from "@/lib/google/mockGoogleData"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({
      success: true,
      connected: true,
      source: "mock",
      tasks: MOCK_GOOGLE_TASKS,
    })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      success: true,
      connected: false,
      tasks: [],
      notice: UI_GOOGLE_TASKS_OFF,
    })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const showCompleted = url.searchParams.get("showCompleted") === "1"
  const liveFromGoogle = url.searchParams.get("live") === "1"

  const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
  if ("error" in tokenResult) {
    if (tokenResult.status === 404) {
      return NextResponse.json({
        success: true,
        connected: false,
        tasks: [],
        notice: "Conecta Google desde Configuración para ver tareas.",
      })
    }
    return NextResponse.json({ success: false, error: tokenResult.error }, { status: tokenResult.status })
  }

  if (!liveFromGoogle) {
    const { tasks, dbError } = await fetchTasksFromExternalTable(auth.supabase, auth.userId, {
      showCompleted,
    })
    if (dbError) {
      console.error("GOOGLE TASKS GET (supabase):", dbError)
      return NextResponse.json(
        { success: false, error: "No se pudieron leer las tareas guardadas." },
        { status: 500 },
      )
    }
    const notice =
      tasks.length === 0
        ? "Las tareas vienen de la última importación. En Agenda, «Importar tareas» actualiza desde Google."
        : undefined
    return NextResponse.json({
      success: true,
      connected: true,
      source: "supabase",
      tasks,
      ...(notice ? { notice } : {}),
    })
  }

  try {
    const tasks = await fetchDefaultTaskList(tokenResult.token, showCompleted)
    return NextResponse.json({ success: true, connected: true, source: "google", tasks })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error Tasks"
    console.error("GOOGLE TASKS GET (live):", msg)
    const fallback = await fetchTasksFromExternalTable(auth.supabase, auth.userId, { showCompleted })
    if (!fallback.dbError && fallback.tasks.length > 0) {
      return NextResponse.json({
        success: true,
        connected: true,
        source: "supabase_fallback",
        tasks: fallback.tasks,
        notice:
          "Google Tasks no respondió (p. ej. cuota). Mostramos la última copia guardada en Órvita; usa «Importar tareas» cuando vuelva la cuota.",
      })
    }
    return NextResponse.json({ success: false, error: "No se pudieron leer las tareas" }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({
      success: true,
      source: "mock",
      task: MOCK_GOOGLE_TASKS[0],
    })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: API_GOOGLE_MUTATION_NO_SYNC,
      },
      { status: 403 },
    )
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: { title?: string; notes?: string; due?: string | null }
  try {
    body = (await req.json()) as { title?: string; notes?: string; due?: string | null }
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const title = String(body?.title ?? "").trim()
  if (!title) {
    return NextResponse.json({ success: false, error: "title es obligatorio" }, { status: 400 })
  }

  const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
  if ("error" in tokenResult) {
    return NextResponse.json(
      { success: false, error: tokenResult.error },
      { status: tokenResult.status === 404 ? 400 : tokenResult.status },
    )
  }

  try {
    const created = await insertDefaultListTask(tokenResult.token, {
      title,
      notes: body.notes,
      due: body.due ?? null,
    })
    const mapped = mapGoogleTask(created)
    if (mapped) {
      const now = new Date().toISOString()
      await auth.supabase.from("external_tasks").upsert(
        {
          user_id: auth.userId,
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
    }
    return NextResponse.json({ success: true, task: mapped ?? created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error creando tarea"
    console.error("GOOGLE TASKS POST:", msg)
    return NextResponse.json({ success: false, error: "No se pudo crear la tarea en Google" }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true, task: MOCK_GOOGLE_TASKS[0] })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({ success: false, error: API_GOOGLE_MUTATION_NO_SYNC }, { status: 403 })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: {
    id?: string
    due?: string | null
    title?: string
    status?: string
    localAssigneeUserId?: string | null
    localPriority?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const id = String(body?.id ?? "").trim()
  if (!id) {
    return NextResponse.json({ success: false, error: "id es obligatorio" }, { status: 400 })
  }

  const wantsGooglePatch =
    body.due !== undefined || body.title !== undefined || body.status !== undefined
  const wantsLocal =
    body.localAssigneeUserId !== undefined || body.localPriority !== undefined

  if (!wantsGooglePatch && !wantsLocal) {
    return NextResponse.json({ success: false, error: "Nada que actualizar" }, { status: 400 })
  }

  if (
    body.localPriority !== undefined &&
    body.localPriority !== null &&
    body.localPriority !== "" &&
    body.localPriority !== "Alta" &&
    body.localPriority !== "Media" &&
    body.localPriority !== "Baja"
  ) {
    return NextResponse.json({ success: false, error: "localPriority inválida" }, { status: 400 })
  }

  try {
    if (wantsGooglePatch) {
      const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
      if ("error" in tokenResult) {
        return NextResponse.json(
          { success: false, error: tokenResult.error },
          { status: tokenResult.status === 404 ? 400 : tokenResult.status },
        )
      }

      const updated = await patchDefaultListTask(tokenResult.token, id, {
        due: body.due,
        title: body.title,
        status: body.status,
      })
      const mapped = mapGoogleTask(updated)
      if (mapped) {
        const now = new Date().toISOString()
        await auth.supabase.from("external_tasks").upsert(
          {
            user_id: auth.userId,
            google_task_id: mapped.id,
            title: mapped.title,
            status: mapped.status,
            due_date: mapped.due,
            raw: updated as Record<string, unknown>,
            synced_at: now,
            deleted_at: null,
          },
          { onConflict: "user_id,google_task_id" },
        )
      }
    }

    if (wantsLocal) {
      const localUp: Record<string, string | null> = {}
      if (body.localAssigneeUserId !== undefined) {
        const v = body.localAssigneeUserId
        localUp.local_assignee_user_id =
          v === null || (typeof v === "string" && v.trim() === "") ? null : String(v).trim()
      }
      if (body.localPriority !== undefined) {
        const p = body.localPriority
        localUp.local_priority =
          p === null || p === "" ? null : p === "Alta" || p === "Media" || p === "Baja" ? p : null
      }

      const loc = await auth.supabase
        .from("external_tasks")
        .update(localUp)
        .eq("user_id", auth.userId)
        .eq("google_task_id", id)
        .is("deleted_at", null)
        .select("google_task_id")
        .maybeSingle()

      if (loc.error) {
        throw loc.error
      }
      if (!loc.data && !wantsGooglePatch) {
        return NextResponse.json(
          { success: false, error: "Tarea no encontrada en Órvita (sincroniza desde Google primero)." },
          { status: 404 },
        )
      }
    }

    const dto = await fetchExternalTaskDtoByGoogleId(auth.supabase, auth.userId, id)
    return NextResponse.json({ success: true, task: dto })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error actualizando tarea"
    console.error("GOOGLE TASKS PATCH:", msg)
    return NextResponse.json(
      {
        success: false,
        error: wantsGooglePatch ? "No se pudo actualizar la tarea en Google" : msg,
      },
      { status: wantsGooglePatch ? 502 : 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({ success: true })
  }

  if (!isSupabaseEnabled()) {
    return NextResponse.json({ success: false, error: API_GOOGLE_MUTATION_NO_SYNC }, { status: 403 })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: { id?: string }
  try {
    body = (await req.json()) as { id?: string }
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const id = String(body?.id ?? "").trim()
  if (!id) {
    return NextResponse.json({ success: false, error: "id es obligatorio" }, { status: 400 })
  }

  const tokenResult = await getGoogleAccessTokenForUser(auth.supabase, auth.userId)
  if ("error" in tokenResult) {
    return NextResponse.json(
      { success: false, error: tokenResult.error },
      { status: tokenResult.status === 404 ? 400 : tokenResult.status },
    )
  }

  try {
    await deleteDefaultListTask(tokenResult.token, id)
    const soft = await auth.supabase
      .from("external_tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", auth.userId)
      .eq("google_task_id", id)
    if (soft.error) {
      console.warn("GOOGLE TASKS DELETE external_tasks soft delete:", soft.error.message)
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error borrando tarea"
    console.error("GOOGLE TASKS DELETE:", msg)
    return NextResponse.json({ success: false, error: "No se pudo borrar la tarea en Google" }, { status: 502 })
  }
}
