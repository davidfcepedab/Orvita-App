import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { fetchDefaultTaskList, insertDefaultListTask, mapGoogleTask } from "@/lib/google/googleTasksApi"
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
      notice:
        "Integración Google usa Supabase para tokens. Activa NEXT_PUBLIC_SUPABASE_ENABLED=true para datos reales.",
    })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const showCompleted = new URL(req.url).searchParams.get("showCompleted") === "1"

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

  try {
    const tasks = await fetchDefaultTaskList(tokenResult.token, showCompleted)
    return NextResponse.json({ success: true, connected: true, tasks })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error Tasks"
    console.error("GOOGLE TASKS GET:", msg)
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
        error: "NEXT_PUBLIC_SUPABASE_ENABLED distinto de true: no se puede crear en Google con persistencia de tokens.",
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
