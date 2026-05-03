import { timingSafeEqual } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function normInvite(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Comprueba que el cuerpo traiga el mismo `invite_code` que el hogar del usuario (RLS).
 * Uso: gate explícito antes de mutar movimientos financieros (trazabilidad operativa).
 */
export async function assertHouseholdInviteCodeForUser(
  supabase: SupabaseClient,
  householdId: string,
  submitted: string | null | undefined,
): Promise<NextResponse | null> {
  const code = typeof submitted === "string" ? submitted.trim() : ""
  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Se requiere el código del hogar (copiado desde Invitaciones) para editar o borrar movimientos.",
      },
      { status: 403 },
    )
  }

  const { data, error } = await supabase
    .from("households")
    .select("invite_code")
    .eq("id", householdId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const row = data as { invite_code?: string | null } | null
  const expected = typeof row?.invite_code === "string" ? row.invite_code.trim() : ""
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "El hogar no tiene código de invitación configurado." },
      { status: 500 },
    )
  }

  const a = Buffer.from(normInvite(code), "utf8")
  const b = Buffer.from(normInvite(expected), "utf8")
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ success: false, error: "Código del hogar incorrecto." }, { status: 403 })
  }

  return null
}
