import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { fetchSubcategoryCatalogMerged, formatPostgrestError } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

const EXPENSE_TYPES = new Set<FinanceSubcategoryCatalogEntry["expense_type"]>(["fijo", "variable", "modulo_finanzas"])
const FIN_IMPACTS = new Set(["operativo", "inversion", "transferencia", "financiero", "ajuste"])

function badRequest(msg: string) {
  return NextResponse.json({ success: false, error: msg }, { status: 400 })
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: { rows: [] as unknown[] },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    return NextResponse.json({ success: true, data: { rows } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("SUBCATEGORY_CATALOG ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando catálogo" }, { status: 500 })
  }
}

/**
 * Crea una fila solo para tu hogar (sobrescribe la global con la misma subcategoría normalizada).
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const subcategory = typeof body.subcategory === "string" ? body.subcategory.trim() : ""
    const category = typeof body.category === "string" ? body.category.trim() : ""
    const expense_type = body.expense_type
    const financial_impact = body.financial_impact

    if (!subcategory || !category) return badRequest("subcategory y category son obligatorios")
    if (typeof expense_type !== "string" || !EXPENSE_TYPES.has(expense_type as FinanceSubcategoryCatalogEntry["expense_type"])) {
      return badRequest("expense_type inválido")
    }
    if (typeof financial_impact !== "string" || !FIN_IMPACTS.has(financial_impact)) {
      return badRequest("financial_impact inválido")
    }

    const budgetable = body.budgetable === undefined ? true : Boolean(body.budgetable)
    const active = body.active === undefined ? true : Boolean(body.active)
    const comment = typeof body.comment === "string" ? body.comment : null

    const { data, error } = await auth.supabase
      .from("orbita_finance_subcategory_catalog")
      .insert({
        household_id: householdId,
        subcategory,
        category,
        expense_type,
        financial_impact,
        budgetable,
        active,
        comment,
      })
      .select("id, household_id, subcategory, category, expense_type, financial_impact, budgetable, active, comment")
      .single()

    if (error) {
      console.error("SUBCATEGORY_CATALOG POST:", formatPostgrestError(error))
      return NextResponse.json(
        { success: false, error: formatPostgrestError(error) || "No se pudo crear la fila" },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, data: { row: data } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("SUBCATEGORY_CATALOG POST:", message)
    return NextResponse.json({ success: false, error: "Error creando fila del catálogo" }, { status: 500 })
  }
}

/**
 * Actualiza una fila del hogar (household_id no null). Las filas globales no son editables desde la API.
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const id = typeof body.id === "string" ? body.id.trim() : ""
    if (!id) return badRequest("id requerido")

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.subcategory !== undefined) {
      if (typeof body.subcategory !== "string" || !body.subcategory.trim()) return badRequest("subcategory inválido")
      patch.subcategory = body.subcategory.trim()
    }
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || !body.category.trim()) return badRequest("category inválido")
      patch.category = body.category.trim()
    }
    if (body.expense_type !== undefined) {
      if (typeof body.expense_type !== "string" || !EXPENSE_TYPES.has(body.expense_type as FinanceSubcategoryCatalogEntry["expense_type"])) {
        return badRequest("expense_type inválido")
      }
      patch.expense_type = body.expense_type
    }
    if (body.financial_impact !== undefined) {
      if (typeof body.financial_impact !== "string" || !FIN_IMPACTS.has(body.financial_impact)) {
        return badRequest("financial_impact inválido")
      }
      patch.financial_impact = body.financial_impact
    }
    if (body.budgetable !== undefined) patch.budgetable = Boolean(body.budgetable)
    if (body.active !== undefined) patch.active = Boolean(body.active)
    if (body.comment !== undefined) patch.comment = typeof body.comment === "string" ? body.comment : null

    if (Object.keys(patch).length <= 1) {
      return badRequest("Nada que actualizar")
    }

    const { data: existing, error: fetchErr } = await auth.supabase
      .from("orbita_finance_subcategory_catalog")
      .select("id, household_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ success: false, error: formatPostgrestError(fetchErr) }, { status: 400 })
    }
    if (!existing || existing.household_id !== householdId) {
      return NextResponse.json({ success: false, error: "Fila no editable o no encontrada" }, { status: 403 })
    }

    const { data, error } = await auth.supabase
      .from("orbita_finance_subcategory_catalog")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdId)
      .select("id, household_id, subcategory, category, expense_type, financial_impact, budgetable, active, comment")
      .single()

    if (error) {
      console.error("SUBCATEGORY_CATALOG PATCH:", formatPostgrestError(error))
      return NextResponse.json(
        { success: false, error: formatPostgrestError(error) || "No se pudo actualizar" },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, data: { row: data } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("SUBCATEGORY_CATALOG PATCH:", message)
    return NextResponse.json({ success: false, error: "Error actualizando catálogo" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({ success: false, error: UI_SYNC_OFF_SHORT }, { status: 503 })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get("id")?.trim()
    if (!id) return badRequest("id requerido")

    const { error } = await auth.supabase
      .from("orbita_finance_subcategory_catalog")
      .delete()
      .eq("id", id)
      .eq("household_id", householdId)

    if (error) {
      return NextResponse.json({ success: false, error: formatPostgrestError(error) }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("SUBCATEGORY_CATALOG DELETE:", message)
    return NextResponse.json({ success: false, error: "Error eliminando fila" }, { status: 500 })
  }
}
