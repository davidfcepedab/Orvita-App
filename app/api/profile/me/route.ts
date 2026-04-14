import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    if (isAppMockMode()) {
      return NextResponse.json({
        success: true,
        data: {
          email: "demo@local.test",
          displayName: "Usuario demo",
          avatarUrl: null as string | null,
          householdFamilyPhotoUrl: null as string | null,
          completeness: 66,
        },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const service = createServiceClient()
    const { data: authUser, error: authErr } = await service.auth.admin.getUserById(auth.userId)
    if (authErr || !authUser?.user) {
      throw authErr ?? new Error("Usuario no encontrado")
    }

    const u = authUser.user
    const meta = u.user_metadata as Record<string, unknown> | undefined
    const fn = meta?.full_name
    const nm = meta?.name
    let displayName: string | null = null
    if (typeof fn === "string" && fn.trim()) displayName = fn.trim()
    else if (typeof nm === "string" && nm.trim()) displayName = nm.trim()

    const email = (u.email ?? "").trim()

    const { data: userRow, error: rowErr } = await service
      .from("users")
      .select("avatar_url, household_id")
      .eq("id", auth.userId)
      .maybeSingle()

    if (rowErr) throw rowErr

    const row = userRow as { avatar_url?: string | null; household_id?: string | null } | null
    const avatarUrl = (row?.avatar_url as string | null | undefined)?.trim() || null

    let householdFamilyPhotoUrl: string | null = null
    const householdId = row?.household_id ?? (await getHouseholdId(auth.supabase, auth.userId))
    if (householdId) {
      const { data: hh, error: hhErr } = await service
        .from("households")
        .select("family_photo_url")
        .eq("id", householdId)
        .maybeSingle()
      if (hhErr) throw hhErr
      const raw = (hh as { family_photo_url?: string | null } | null)?.family_photo_url
      householdFamilyPhotoUrl = typeof raw === "string" && raw.trim() ? raw.trim() : null
    }

    const hasName = Boolean(displayName && displayName.length >= 2)
    const hasPhoto = Boolean(avatarUrl)
    const hasHousePhoto = Boolean(householdFamilyPhotoUrl)
    const completeness = Math.min(
      100,
      Math.round((hasPhoto ? 38 : 0) + (hasName ? 37 : 0) + (hasHousePhoto ? 25 : 0)),
    )

    return NextResponse.json({
      success: true,
      data: {
        email,
        displayName,
        avatarUrl,
        householdFamilyPhotoUrl,
        completeness,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error cargando perfil"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
