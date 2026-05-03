import type { SupabaseClient } from "@supabase/supabase-js"
import { moneyPressureFromMonth } from "@/lib/hoy/commandDerivation"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { isBelvoSandbox } from "@/lib/integrations/banking-colombia"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import type { CapitalPressureLevel, OperationalCapitalSnapshot } from "@/lib/operational/types"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function currentYm() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

function bandToCapitalPressure(b: "bajo" | "moderado" | "alto"): CapitalPressureLevel {
  if (b === "bajo") return "baja"
  if (b === "moderado") return "media"
  return "alta"
}

function isDegradedSandbox(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false
  const m = meta as Record<string, unknown>
  return m.degraded_mode === true || m.connector === "belvo_sandbox_fallback"
}

/**
 * Agrega capital operativo (Belvo + P&L del hogar) al contexto estratégico.
 * Usa `bank_accounts` del usuario y movimientos del hogar vía `computeFinanceMonthState`.
 */
export async function fetchOperationalCapitalSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<OperationalCapitalSnapshot | null> {
  const monthKey = currentYm()
  const bounds = monthBounds(monthKey)
  if (!bounds) return null

  const householdId = await getHouseholdId(supabase, userId)

  const [{ data: accounts, error: accErr }, txRows] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("balance_current,balance_available,last_synced_at,connected,metadata")
      .eq("user_id", userId)
      .eq("connected", true),
    householdId
      ? getTransactionsByRange(supabase, bounds.prevStartStr, bounds.endStr, { householdId })
      : Promise.resolve([]),
  ])

  if (accErr) {
    console.warn("[fetchOperationalCapitalSnapshot] bank_accounts", accErr.message)
  }

  const rows = accounts ?? []
  let totalBalance = 0
  let lastSync: string | null = null
  let sandboxDegraded = false

  for (const r of rows) {
    const raw = r.balance_current ?? r.balance_available
    const bal = typeof raw === "number" ? raw : Number(raw)
    if (Number.isFinite(bal)) totalBalance += bal
    const ls = r.last_synced_at
    if (typeof ls === "string" && ls) {
      if (!lastSync || Date.parse(ls) > Date.parse(lastSync)) lastSync = ls
    }
    if (isDegradedSandbox(r.metadata)) sandboxDegraded = true
  }

  let monthlyNetCop = 0
  let monthIncome = 0
  let monthExpense = 0

  if (householdId) {
    const currentRows = txRows.filter((r) => r.date >= bounds.startStr && r.date <= bounds.endStr)
    const previousRows = txRows.filter((r) => r.date >= bounds.prevStartStr && r.date <= bounds.prevEndStr)
    try {
      const state = await computeFinanceMonthState(supabase, householdId, monthKey, currentRows, previousRows)
      monthlyNetCop = state.overview.net
      monthIncome = state.overview.income
      monthExpense = state.overview.expense
    } catch {
      /* sin hogar o mes incompleto */
    }
  }

  const mp = moneyPressureFromMonth(monthIncome, monthExpense)
  const pressure: CapitalPressureLevel = householdId ? bandToCapitalPressure(mp.band) : "baja"

  if (rows.length === 0 && !householdId) return null

  return {
    totalBalanceCop: Math.round(totalBalance),
    monthlyNetCop: Math.round(monthlyNetCop),
    pressure,
    lastBankSyncAt: lastSync,
    connectedAccounts: rows.length,
    belvoSandbox: isBelvoSandbox(),
    sandboxDegraded,
  }
}
