import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  mapOperationalTask,
  type OperationalTaskRow,
} from "@/lib/operational/mappers"
import {
  parseTaskCreate,
  parseTaskPatch,
} from "@/lib/operational/validators"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const domain = req.nextUrl.searchParams.get("domain")
    const query = supabase
      .from("operational_tasks")
      .select("id,title,completed,domain,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (domain) query.eq("domain", domain)

    const { data, error } = await query
    if (error) throw error

    const tasks = (data ?? []).map((row) => mapOperationalTask(row as OperationalTaskRow))
    return NextResponse.json({ success: true, data: tasks })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("TASKS GET ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo cargar tareas" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const body = await req.json()
    const parsed = parseTaskCreate(body)
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("operational_tasks")
      .insert({
        user_id: userId,
        title: parsed.title,
        completed: parsed.completed,
        domain: parsed.domain,
      })
      .select("id,title,completed,domain,created_at")
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: mapOperationalTask(data as OperationalTaskRow),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("TASKS POST ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo crear tarea" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const body = await req.json()
    const parsed = parseTaskPatch(body)
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("operational_tasks")
      .update(parsed.patch)
      .eq("id", parsed.id)
      .eq("user_id", userId)
      .select("id,title,completed,domain,created_at")
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: mapOperationalTask(data as OperationalTaskRow),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("TASKS PATCH ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo actualizar tarea" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
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
      .from("operational_tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("TASKS DELETE ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo eliminar tarea" },
      { status: 500 }
    )
  }
}
