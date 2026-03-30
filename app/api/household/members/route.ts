import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { userId } = auth
    const householdId = await getHouseholdId(auth.supabase, userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const db = createServiceClient()

    const { data: household, error: hhError } = await db
      .from("households")
      .select("owner_user_id")
      .eq("id", householdId)
      .single()

    if (hhError || !household) {
      throw hhError ?? new Error("Hogar no encontrado")
    }

    const { data: rows, error: usersError } = await db
      .from("users")
      .select("id, email")
      .eq("household_id", householdId)

    if (usersError) {
      throw usersError
    }

    const ownerId = household.owner_user_id as string | null
    const members: HouseholdMemberDTO[] = []

    for (const row of rows ?? []) {
      const uid = row.id as string
      let displayName: string | null = null
      let email = (row.email as string | null)?.trim() ?? ""

      const { data: authUser } = await db.auth.admin.getUserById(uid)
      const u = authUser?.user
      if (u?.email && !email) {
        email = u.email
      }
      const meta = u?.user_metadata as Record<string, unknown> | undefined
      const fn = meta?.full_name
      const nm = meta?.name
      if (typeof fn === "string" && fn.trim()) displayName = fn.trim()
      else if (typeof nm === "string" && nm.trim()) displayName = nm.trim()

      members.push({
        id: uid,
        email,
        displayName,
        isOwner: ownerId != null && uid === ownerId,
      })
    }

    members.sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1
      const la = (a.displayName || a.email).toLowerCase()
      const lb = (b.displayName || b.email).toLowerCase()
      return la.localeCompare(lb, "es")
    })

    return NextResponse.json({ success: true, data: { members } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error cargando miembros"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
