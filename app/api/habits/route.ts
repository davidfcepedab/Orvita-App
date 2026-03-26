import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import {
  mapOperationalHabit,
  type OperationalHabitRow,
} from "@/lib/operational/mappers"
import {
  parseHabitCreate,
  parseHabitPatch,
} from "@/lib/operational/validators"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const domain = req.nextUrl.searchParams.get("domain")
    const query = supabase
      .from("operational_habits")
      .select("id,name,completed,domain,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (domain) query.eq("domain", domain)

    const { data, error } = await query
    if (error) throw error

    const habits = (data ?? []).map((row) => mapOperationalHabit(row as OperationalHabitRow))
    return NextResponse.json({ success: true, data: habits })
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
      })
      .select("id,name,completed,domain,created_at")
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
      .select("id,name,completed,domain,created_at")
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
