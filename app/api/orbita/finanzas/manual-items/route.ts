import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

const KINDS = ["savings", "credit_card", "structural_loan"] as const
type ItemKind = (typeof KINDS)[number]

type DbRow = {
  id: string
  household_id: string
  item_kind: string
  sort_order: number
  data: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

function isKind(s: string): s is ItemKind {
  return (KINDS as readonly string[]).includes(s)
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: "NEXT_PUBLIC_SUPABASE_ENABLED≠true: ítems manuales solo en localStorage.",
        data: { items: [] },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const { data, error } = await auth.supabase
      .from("household_finance_manual_items")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: { items: data ?? [] } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("MANUAL ITEMS GET:", msg)
    return NextResponse.json({ success: false, error: "Error cargando ítems" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: usa almacenamiento local en Cuentas." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as { item_kind?: string; data?: Record<string, unknown>; sort_order?: number }
    const item_kind = String(body.item_kind ?? "")
    if (!isKind(item_kind)) {
      return NextResponse.json({ success: false, error: "item_kind inválido" }, { status: 400 })
    }

    const data = body.data && typeof body.data === "object" ? body.data : {}
    const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0

    const { data: row, error } = await auth.supabase
      .from("household_finance_manual_items")
      .insert({
        household_id: householdId,
        item_kind,
        sort_order,
        data,
      })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data: { item: row as DbRow } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("MANUAL ITEMS POST:", msg)
    return NextResponse.json({ success: false, error: "Error creando ítem" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: usa almacenamiento local en Cuentas." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as { id?: string; data?: Record<string, unknown>; sort_order?: number }
    const id = String(body.id ?? "")
    if (!id) return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.data != null && typeof body.data === "object") patch.data = body.data
    if (body.sort_order != null && Number.isFinite(Number(body.sort_order))) patch.sort_order = Number(body.sort_order)

    const { data, error } = await auth.supabase
      .from("household_finance_manual_items")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdId)
      .select("*")
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ success: false, error: "Ítem no encontrado" }, { status: 404 })

    return NextResponse.json({ success: true, data: { item: data as DbRow } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("MANUAL ITEMS PATCH:", msg)
    return NextResponse.json({ success: false, error: "Error actualizando ítem" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: elimina en local desde la UI." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })

    const { error } = await auth.supabase
      .from("household_finance_manual_items")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("MANUAL ITEMS DELETE:", msg)
    return NextResponse.json({ success: false, error: "Error eliminando ítem" }, { status: 500 })
  }
}
