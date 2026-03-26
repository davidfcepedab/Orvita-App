import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function normalizePassword(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeInviteCode(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function buildHouseholdName(email: string) {
  const base = email.split("@")[0]?.trim()
  return base ? `${base} Household` : "Household"
}

function generateInviteCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = normalizeEmail(body?.email)
    const password = normalizePassword(body?.password)
    const inviteCode = normalizeInviteCode(body?.inviteCode)

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email y password requeridos" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServiceClient()

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError || !authUser.user) {
      const message = authError?.message ?? "No se pudo crear usuario"
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    const userId = authUser.user.id

    let householdId: string

    if (inviteCode) {
      const { data: household, error: householdError } = await supabaseAdmin
        .from("households")
        .select("id")
        .eq("invite_code", inviteCode)
        .single()

      if (householdError || !household) {
        return NextResponse.json(
          { success: false, error: "Invite code inválido" },
          { status: 400 }
        )
      }

      householdId = household.id
    } else {
      let createdHouseholdId: string | null = null
      let lastError: Error | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: newHousehold, error: createError } = await supabaseAdmin
          .from("households")
          .insert({
            owner_user_id: userId,
            name: buildHouseholdName(email),
            invite_code: generateInviteCode(),
          })
          .select("id")
          .single()

        if (!createError && newHousehold) {
          createdHouseholdId = newHousehold.id
          break
        }

        lastError = createError ?? new Error("No se pudo crear household")
        const code = (createError as { code?: string } | null)?.code
        if (code !== "23505") {
          break
        }
      }

      if (!createdHouseholdId) {
        return NextResponse.json(
          { success: false, error: lastError?.message ?? "No se pudo crear household" },
          { status: 500 }
        )
      }

      householdId = createdHouseholdId
    }

    const { error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        email,
        household_id: householdId,
      })

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => null)
      return NextResponse.json(
        { success: false, error: "No se pudo registrar usuario" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error registrando usuario"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
