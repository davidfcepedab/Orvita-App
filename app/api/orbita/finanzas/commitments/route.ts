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

    const { data, error } = await auth.supabase
      .from("user_flow_commitments")
      .select("id, household_id, title, category, due_date, amount, flow_type, created_at, updated_at")
      .eq("household_id", householdId)
      .order("due_date", { ascending: true })

    if (error) throw error

    const rows = (data ?? []) as UserFlowCommitmentRow[]
    return NextResponse.json({
      success: true,
      data: { commitments: rows.map(flowCommitmentFromDbRow) },
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

    const body = (await req.json()) as {
      title?: string
      category?: string
      date?: string
      due_date?: string
      amount?: number
      flowType?: string
      flow_type?: string
    }

    const title = String(body.title ?? "").trim()
    const category = String(body.category ?? "").trim()
    const dueRaw = String(body.due_date ?? body.date ?? "").slice(0, 10)
    const amount = Number(body.amount)
    const ftRaw = String(body.flow_type ?? body.flowType ?? "fixed")

    if (!title || !dueRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) {
      return NextResponse.json({ success: false, error: "Título y fecha válidos requeridos" }, { status: 400 })
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
        due_date: dueRaw,
        amount,
        flow_type: ftRaw,
      })
      .select("id, household_id, title, category, due_date, amount, flow_type, created_at, updated_at")
      .single()

    if (error) throw error
    return NextResponse.json({
      success: true,
      data: { commitment: flowCommitmentFromDbRow(data as UserFlowCommitmentRow) },
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

    const body = (await req.json()) as {
      id?: string
      title?: string
      category?: string
      date?: string
      due_date?: string
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
    if (body.due_date != null || body.date != null) {
      const d = String(body.due_date ?? body.date).slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ success: false, error: "Fecha inválida" }, { status: 400 })
      }
      patch.due_date = d
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
      .select("id, household_id, title, category, due_date, amount, flow_type, created_at, updated_at")
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ success: false, error: "Compromiso no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { commitment: flowCommitmentFromDbRow(data as UserFlowCommitmentRow) },
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
