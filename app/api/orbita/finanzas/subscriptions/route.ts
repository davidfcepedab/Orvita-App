import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { API_NOTICE_SUBSCRIPTIONS_LOCAL, isSupabaseEnabled } from "@/lib/checkins/flags"
import { dayFromIso } from "@/lib/finanzas/commitmentAnchorDate"
import {
  nextRenewalIsoFromDay,
  normalizeBillingFrequency,
} from "@/lib/finanzas/subscriptionBilling"
import { normalizeUserSubscription } from "@/lib/finanzas/userSubscriptionsNormalize"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import type { SubscriptionStatus, UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
import { SUBSCRIPTION_CATEGORIES } from "@/lib/finanzas/userSubscriptionsTypes"

export const runtime = "nodejs"

type DbRow = {
  id: string
  household_id: string
  name: string
  category: string
  amount_monthly: number | string
  renewal_date: string
  billing_frequency?: string | null
  renewal_day?: number | string | null
  include_in_simulator: boolean
  active: boolean
  status: string
  created_at?: string
  updated_at?: string
}

function mapRow(r: DbRow): UserSubscription {
  const renewal_date =
    typeof r.renewal_date === "string" ? r.renewal_date.slice(0, 10) : String(r.renewal_date)
  const renewal_day_raw =
    r.renewal_day != null && r.renewal_day !== ""
      ? Number(r.renewal_day)
      : dayFromIso(renewal_date)
  const renewal_day = Math.min(28, Math.max(1, Math.round(renewal_day_raw) || 1))
  return normalizeUserSubscription({
    id: r.id,
    name: r.name,
    category: r.category,
    amount_monthly: Number(r.amount_monthly),
    renewal_date,
    billing_frequency: normalizeBillingFrequency(r.billing_frequency),
    renewal_day,
    include_in_simulator: r.include_in_simulator,
    active: r.active,
    status: r.status as SubscriptionStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })
}

function validCategory(c: string) {
  return (SUBSCRIPTION_CATEGORIES as readonly string[]).includes(c)
}

function syncActive(status: SubscriptionStatus) {
  return status === "active"
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: API_NOTICE_SUBSCRIPTIONS_LOCAL,
        data: { subscriptions: [] as UserSubscription[] },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const { data, error } = await auth.supabase
      .from("user_subscriptions")
      .select("*")
      .eq("household_id", householdId)
      .order("renewal_date", { ascending: true })

    if (error) throw error

    const rows = (data ?? []) as DbRow[]
    return NextResponse.json({ success: true, data: { subscriptions: rows.map(mapRow) } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("SUBSCRIPTIONS GET:", msg)
    return NextResponse.json({ success: false, error: "Error cargando suscripciones" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: guarda en local desde la UI." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as Partial<UserSubscription> & { status?: SubscriptionStatus }
    const name = String(body.name ?? "").trim()
    const category = String(body.category ?? "").trim()
    const amount_monthly = Number(body.amount_monthly)
    const billing_frequency = normalizeBillingFrequency(body.billing_frequency)
    const renewal_day = Math.min(
      28,
      Math.max(1, Math.round(Number(body.renewal_day ?? dayFromIso(String(body.renewal_date ?? ""))))),
    )
    let renewal_date = String(body.renewal_date ?? "").slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(renewal_date)) {
      renewal_date = nextRenewalIsoFromDay(renewal_day)
    }
    const include_in_simulator = Boolean(body.include_in_simulator)
    const status: SubscriptionStatus =
      body.status === "paused" || body.status === "cancelled" ? body.status : "active"

    if (!name) {
      return NextResponse.json({ success: false, error: "Nombre requerido" }, { status: 400 })
    }
    if (!validCategory(category)) {
      return NextResponse.json({ success: false, error: "Categoría no válida" }, { status: 400 })
    }
    if (!Number.isFinite(amount_monthly) || amount_monthly < 0) {
      return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 })
    }

    const active = syncActive(status)

    const { data, error } = await auth.supabase
      .from("user_subscriptions")
      .insert({
        household_id: householdId,
        name,
        category,
        amount_monthly,
        renewal_date,
        billing_frequency,
        renewal_day,
        include_in_simulator,
        status,
        active,
      })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data: { subscription: mapRow(data as DbRow) } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("SUBSCRIPTIONS POST:", msg)
    return NextResponse.json({ success: false, error: "Error creando suscripción" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { success: false, error: "Supabase desactivado: guarda en local desde la UI." },
        { status: 400 },
      )
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const body = (await req.json()) as Partial<UserSubscription> & { id?: string }
    const id = String(body.id ?? "")
    if (!id) {
      return NextResponse.json({ success: false, error: "id requerido" }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name != null) patch.name = String(body.name).trim()
    if (body.category != null) {
      const c = String(body.category).trim()
      if (!validCategory(c)) {
        return NextResponse.json({ success: false, error: "Categoría no válida" }, { status: 400 })
      }
      patch.category = c
    }
    if (body.amount_monthly != null) {
      const n = Number(body.amount_monthly)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Monto inválido" }, { status: 400 })
      }
      patch.amount_monthly = n
    }
    if (body.billing_frequency != null) {
      patch.billing_frequency = normalizeBillingFrequency(body.billing_frequency)
    }
    if (body.renewal_day != null) {
      const rd = Math.min(28, Math.max(1, Math.round(Number(body.renewal_day))))
      patch.renewal_day = rd
      patch.renewal_date = nextRenewalIsoFromDay(rd)
    } else if (body.renewal_date != null) {
      const d = String(body.renewal_date).slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ success: false, error: "Fecha inválida" }, { status: 400 })
      }
      patch.renewal_date = d
      patch.renewal_day = Math.min(28, Math.max(1, dayFromIso(d)))
    }
    if (body.include_in_simulator != null) patch.include_in_simulator = Boolean(body.include_in_simulator)
    if (body.status != null) {
      const st = body.status as SubscriptionStatus
      if (st !== "active" && st !== "paused" && st !== "cancelled") {
        return NextResponse.json({ success: false, error: "Estado inválido" }, { status: 400 })
      }
      patch.status = st
      patch.active = syncActive(st)
    }
    if (body.active != null && body.status == null) {
      patch.active = Boolean(body.active)
    }

    const { data, error } = await auth.supabase
      .from("user_subscriptions")
      .update(patch)
      .eq("id", id)
      .eq("household_id", householdId)
      .select("*")
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ success: false, error: "Suscripción no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { subscription: mapRow(data as DbRow) } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    console.error("SUBSCRIPTIONS PATCH:", msg)
    return NextResponse.json({ success: false, error: "Error actualizando suscripción" }, { status: 500 })
  }
}
