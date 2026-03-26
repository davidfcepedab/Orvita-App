import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { mapCheckin, type CheckinRow } from "@/lib/operational/mappers"
import { parseCheckinCreate } from "@/lib/operational/validators"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth
    const { supabase, userId } = auth

    const { data, error } = await supabase
      .from("checkins")
      .select("id,score_global,score_fisico,score_salud,score_profesional,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) throw error

    const checkins = (data ?? []).map((row) => mapCheckin(row as CheckinRow))
    return NextResponse.json({ success: true, data: checkins })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("CHECKINS GET ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo cargar checkins" },
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
    const parsed = parseCheckinCreate(body)
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        score_global: parsed.score_global,
        score_fisico: parsed.score_fisico,
        score_salud: parsed.score_salud,
        score_profesional: parsed.score_profesional,
      })
      .select("id,score_global,score_fisico,score_salud,score_profesional,created_at")
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: mapCheckin(data as CheckinRow),
    })
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error desconocido"
    console.error("CHECKINS POST ERROR:", detail)
    return NextResponse.json(
      { success: false, error: "No se pudo crear checkin" },
      { status: 500 }
    )
  }
}
