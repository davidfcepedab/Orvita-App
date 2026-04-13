import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import type { MonthCategoryBudgetsV1 } from "@/lib/finanzas/categoryBudgetStorage"

export const runtime = "nodejs"

function isValidTemplate(x: unknown): x is MonthCategoryBudgetsV1 {
  if (!x || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  if (o.version !== 1) return false
  if (!o.category || typeof o.category !== "object" || Array.isArray(o.category)) return false
  if (!o.subcategory || typeof o.subcategory !== "object" || Array.isArray(o.subcategory)) return false
  return true
}

export async function GET(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({
      success: true,
      data: {
        template: { version: 1 as const, category: {}, subcategory: {} },
        updated_at: new Date().toISOString(),
      },
    })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  const householdId = await getHouseholdId(auth.supabase, auth.userId)
  if (!householdId) {
    return NextResponse.json({ success: false, error: "Sin hogar asociado" }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from("household_finance_category_budgets")
    .select("template, updated_at")
    .eq("household_id", householdId)
    .maybeSingle()

  if (error) {
    console.error("category-budgets GET:", error.message)
    return NextResponse.json({ success: false, error: "No se pudieron leer los presupuestos" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ success: true, data: null })
  }

  const template =
    data.template && isValidTemplate(data.template)
      ? data.template
      : ({ version: 1 as const, category: {}, subcategory: {} } satisfies MonthCategoryBudgetsV1)

  return NextResponse.json({
    success: true,
    data: {
      template,
      updated_at: data.updated_at,
    },
  })
}

export async function POST(req: NextRequest) {
  if (isAppMockMode()) {
    return NextResponse.json({
      success: true,
      data: {
        template: { version: 1 as const, category: {}, subcategory: {} },
        updated_at: new Date().toISOString(),
      },
    })
  }

  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 })
  }

  const template = (body as { template?: unknown })?.template
  if (!isValidTemplate(template)) {
    return NextResponse.json({ success: false, error: "Plantilla de presupuesto inválida" }, { status: 400 })
  }

  const householdId = await getHouseholdId(auth.supabase, auth.userId)
  if (!householdId) {
    return NextResponse.json({ success: false, error: "Sin hogar asociado" }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data: upserted, error } = await auth.supabase
    .from("household_finance_category_budgets")
    .upsert(
      {
        household_id: householdId,
        template,
        updated_at: now,
      },
      { onConflict: "household_id" },
    )
    .select("template, updated_at")
    .maybeSingle()

  if (error) {
    console.error("category-budgets POST:", error.message)
    return NextResponse.json({ success: false, error: "No se pudieron guardar los presupuestos" }, { status: 500 })
  }

  const outTemplate =
    upserted?.template && isValidTemplate(upserted.template)
      ? upserted.template
      : template

  return NextResponse.json({
    success: true,
    data: {
      template: outTemplate,
      updated_at: upserted?.updated_at ?? now,
    },
  })
}
