import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

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

    const { data, error } = await supabase
      .from("households")
      .select("invite_code")
      .eq("id", householdId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        inviteCode: data.invite_code,
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error cargando invite code"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
