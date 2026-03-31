import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { flowCommitmentFromDbRow, type UserFlowCommitmentRow } from "@/lib/finanzas/flowCommitmentsDbMap"
import type { FlowCommitmentFlowType } from "@/lib/finanzas/flowCommitmentsTypes"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

const FLOW_TYPES: FlowCommitmentFlowType[] = ["fixed", "one-time", "recurring", "income"]

function validFlowType(v: string): v is FlowCommitmentFlowType {
  return FLOW_TYPES.includes(v as FlowCommitmentFlowType)
}

function anchorMonthFromReq(req: NextRequest): string {
  const q = req.nextUrl.searchParams.get("month")
  if (q && /^\d{4}-\d{2}$/.test(q)) return q
  return new Date().toISOString().slice(0, 7)
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: true, data: { commitments: [] } })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const anchor = anchorMonthFromReq(req)

    const { data, error } = await auth.supabase
      .from("user_flow_commitments")
      .select(
        "id, household_id, title, category, subcategory, due_day, due_date, amount, flow_type, created_at, updated_at",
      )
      .eq("household_id", householdId)
      .order("due_day", { ascending: true })
      .order("title", { ascending: true })

    if (error) throw error

    const rows = (data ?? []) as UserFlowCommitmentRow[]
    return NextResponse.json({
      success: true,
      data: { commitments: rows.map((r) => flowCommitmentFromDbRow(r, anchor)) },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("COMMITMENTS GET:", msg)
    return NextResponse.json({ success: false, error: "Error cargando compromisos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: usa almacenamiento local en el simulador." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const anchor = anchorMonthFromReq(req)

    const body = (await req.json()) as {
      title?: string
      category?: string
      subcategory?: string
      due_day?: number
      dueDay?: number
      amount?: number
      flowType?: string
      flow_type?: string
    }

    const title = String(body.title ?? "").trim()
    const category = String(body.category ?? "").trim()
    const subcategory = String(body.subcategory ?? "").trim()
    const dueDay = Number(body.due_day ?? body.dueDay)
    const amount = Number(body.amount)
    const ftRaw = String(body.flow_type ?? body.flowType ?? "fixed")

    if (!title || !Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      return NextResponse.json({ success: false, error: "Título y día del mes (1–31) requeridos" }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 })
    }
    if (!validFlowType(ftRaw)) {
      return NextResponse.json({ success: false, error: "Tipo de flujo inválido" }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from("user_flow_commitments")
      .insert({
        household_id: householdId,
        title,
        category,
        subcategory,
        due_day: Math.round(dueDay),
        due_date: null,
        amount,
        flow_type: ftRaw,
      })
      .select(
        "id, household_id, title, category, subcategory, due_day, due_date, amount, flow_type, created_at, updated_at",
      )
      .single()

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: { commitment: flowCommitmentFromDbRow(data as UserFlowCommitmentRow, anchor) },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("COMMITMENTS POST:", msg)
    return NextResponse.json({ success: false, error: "Error creando compromiso" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: "Supabase desactivado" }, { status: 400 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const anchor = anchorMonthFromReq(req)

    const body = (await req.json()) as {
      id?: string
      title?: string
      category?: string
      subcategory?: string
      due_day?: number
      dueDay?: number
      amount?: number
      flowType?: string
      flow_type?: string
    }

    const id = String(body.id ?? "")
    if (!id) {
      return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.title != null) patch.title = String(body.title).trim()
    if (body.category != null) patch.category = String(body.category).trim()
    if (body.subcategory != null) patch.subcategory = String(body.subcategory).trim()
    if (body.due_day != null || body.dueDay != null) {
      const d = Number(body.due_day ?? body.dueDay)
      if (!Number.isFinite(d) || d < 1 || d > 31) {
        return NextResponse.json({ success: false, error: "Día del mes inválido" }, { status: 400 })
      }
      patch.due_day = Math.round(d)
      patch.due_date = null
    }
    if (body.amount != null) {
      const n = Number(body.amount)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 })
      }
      patch.amount = n
    }
    const ft = body.flow_type ?? body.flowType
    if (ft != null) {
      if (!validFlowType(String(ft))) {
        return NextResponse.json({ success: false, error: "Tipo de flujo inválido" }, { status: 400 })
      }
      patch.flow_type = String(ft)
    }

    const { data, error } = await auth.supabase
      .from("user_flow_commitments")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdId)
      .select(
        "id, household_id, title, category, subcategory, due_day, due_date, amount, flow_type, created_at, updated_at",
      )
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ success: false, error: "Compromiso no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { commitment: flowCommitmentFromDbRow(data as UserFlowCommitmentRow, anchor) },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("COMMITMENTS PATCH:", msg)
    return NextResponse.json({ success: false, error: "Error actualizando compromiso" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: "Supabase desactivado" }, { status: 400 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get("id") ?? ""
    if (!id) {
      return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from("user_flow_commitments")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId)
      .select("id")
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ success: false, error: "Compromiso no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("COMMITMENTS DELETE:", msg)
    return NextResponse.json({ success: false, error: "Error eliminando compromiso" }, { status: 500 })
  }
}
