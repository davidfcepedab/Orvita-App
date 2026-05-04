import type { SupabaseClient } from "@supabase/supabase-js"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceModuleMeta } from "@/lib/finanzas/financeModuleMeta"
import { buildCompleteMonthFinanceCoherence, type MonthBridgeEntryLite } from "@/lib/finanzas/monthFinanceCoherence"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { monthBounds } from "@/lib/finanzas/monthRange"
import {
  fetchReconciliationHintEma,
  HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA,
} from "@/lib/finanzas/reconciliationHints"
import { excludeReconciliationFromOperativoAnalysis } from "@/lib/finanzas/reconciliationTxFilter"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import {
  createIncomeForMetricsFn,
  type LedgerTcRef,
} from "@/lib/finanzas/incomeCashEconomy"

export type FinanceMonthOpex = (tx: FinanceTransaction) => number

export type ComputedFinanceMonthState = {
  overview: ReturnType<typeof calculateOverview>
  opex: FinanceMonthOpex
  /** Ingreso para KPI/resúmenes: excluye líneas de ingreso enlazadas a TC cuando hay cuentas `tarjeta_credito`. */
  incomeForMetrics: (tx: FinanceTransaction) => number
  snapshotKpiNotice?: string
  usedSnapshotForKpi: boolean
  txMagBeforeMerge: number
  snapMag: number
  hasOperativoCatalog: boolean
  /** Mismo catálogo usado para opex y coherencia (activo, merge global+hogar). */
  catalogRows: FinanceSubcategoryCatalogRow[]
  transactionsInSelectedMonth: number
  meta: FinanceModuleMeta
}

/**
 * KPI del mes + meta (última TX, referencia) con la misma regla que overview:
 * snapshot reemplaza KPI si no hay magnitud en movimientos del mes.
 */
export async function computeFinanceMonthState(
  supabase: SupabaseClient,
  householdId: string,
  month: string,
  currentRows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
): Promise<ComputedFinanceMonthState> {
  const bounds = monthBounds(month)
  if (!bounds) {
    throw new Error("month inválido")
  }

  let catalogRows: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
  try {
    catalogRows = await fetchSubcategoryCatalogMerged(supabase, householdId)
  } catch (e) {
    console.warn("FINANCE_MONTH_STATE: catálogo no disponible", e)
  }

  let tcRefs: LedgerTcRef[] = []
  try {
    const { data: tcRows } = await supabase
      .from("orbita_finance_accounts")
      .select("id, label")
      .eq("household_id", householdId)
      .eq("account_class", "tarjeta_credito")
    tcRefs = (tcRows ?? [])
      .map((r) => ({
        id: String((r as { id?: unknown }).id ?? "").trim(),
        label: String((r as { label?: unknown }).label ?? "").trim(),
      }))
      .filter((r) => r.id.length > 0)
  } catch (e) {
    console.warn("FINANCE_MONTH_STATE: cuentas tarjeta_credito no disponibles", e)
  }

  const opex = createOperativoExpenseFn(catalogRows)
  const hasOperativoCatalog = catalogRows.length > 0
  const incomeForMetrics = createIncomeForMetricsFn(tcRefs)

  const operativoCurrent = excludeReconciliationFromOperativoAnalysis(currentRows)
  const operativoPrevious = excludeReconciliationFromOperativoAnalysis(previousRows)

  let overview = calculateOverview(operativoCurrent, operativoPrevious, {
    expenseAmount: opex,
    incomeAmount: incomeForMetrics,
  })
  const txMagBeforeMerge = overview.income + overview.expense

  const [yStr, mStr] = month.split("-")
  const y = Number(yStr)
  const mo = Number(mStr)
  const prevYm =
    mo === 1
      ? { year: y - 1, month: 12 }
      : { year: y, month: mo - 1 }

  const [{ data: snapCur }, { data: snapPrev }] = await Promise.all([
    supabase
      .from("finance_monthly_snapshots")
      .select("total_income,total_expense,balance")
      .eq("household_id", householdId)
      .eq("year", y)
      .eq("month", mo)
      .maybeSingle(),
    supabase
      .from("finance_monthly_snapshots")
      .select("total_income,total_expense,balance")
      .eq("household_id", householdId)
      .eq("year", prevYm.year)
      .eq("month", prevYm.month)
      .maybeSingle(),
  ])

  const snapIn = Number(snapCur?.total_income ?? 0)
  const snapEx = Number(snapCur?.total_expense ?? 0)
  const snapMag = snapIn + snapEx
  let snapshotKpiNotice: string | undefined

  if (txMagBeforeMerge < 1 && snapMag > 1) {
    const prevIn = Number(snapPrev?.total_income ?? 0)
    const prevEx = Number(snapPrev?.total_expense ?? 0)
    const prevNet = prevIn - prevEx
    const net = snapIn - snapEx
    const deltaNet =
      Math.abs(prevNet) > 1e-6 ? ((net - prevNet) / Math.abs(prevNet)) * 100 : null
    overview = {
      income: snapIn,
      expense: snapEx,
      net,
      savingsRate: snapIn !== 0 ? (net / snapIn) * 100 : 0,
      previousNet: prevNet,
      deltaNet,
      runway: snapEx > 0 && net > 0 ? net / snapEx : 0,
    }
    snapshotKpiNotice = hasOperativoCatalog
      ? "KPI del mes desde finance_monthly_snapshots (no hay movimientos del mes en transacciones). Gráficos semanales y listas dependen de TX importadas: pueden verse vacíos hasta registrar movimientos."
      : "KPI del mes desde finance_monthly_snapshots: la suma de movimientos del mes en transacciones fue 0."
  } else if (txMagBeforeMerge < 1 && snapMag < 1) {
    snapshotKpiNotice =
      "Sin movimientos ni resumen almacenado para este mes en la base; las cifras pueden ser 0 hasta importar datos o generar el cierre mensual."
  }

  const usedSnapshotForKpi = txMagBeforeMerge < 1 && snapMag > 1
  const kpiHasSignal = overview.income > 0.5 || overview.expense > 0.5
  const kpiSource: FinanceModuleMeta["kpiSource"] =
    txMagBeforeMerge >= 1 ? "transactions" : usedSnapshotForKpi || kpiHasSignal ? "snapshot" : "empty"

  const { data: lastTxRow } = await supabase
    .from("orbita_finance_transactions")
    .select("date, updated_at")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastTransactionDate =
    typeof lastTxRow?.date === "string" && lastTxRow.date.length >= 10 ? lastTxRow.date.slice(0, 10) : null
  const lastTransactionUpdatedAt =
    typeof lastTxRow?.updated_at === "string" ? lastTxRow.updated_at : null

  let reference: FinanceModuleMeta["reference"]
  if (!kpiHasSignal) {
    const { data: snapLatest } = await supabase
      .from("finance_monthly_snapshots")
      .select("year,month,total_income,total_expense,balance")
      .eq("household_id", householdId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(48)

    for (const r of snapLatest ?? []) {
      const ti = Number((r as { total_income?: unknown }).total_income ?? 0)
      const te = Number((r as { total_expense?: unknown }).total_expense ?? 0)
      if (ti + te > 1) {
        const yy = Number((r as { year?: unknown }).year)
        const mm = Number((r as { month?: unknown }).month)
        if (yy && mm >= 1 && mm <= 12) {
          reference = {
            month: `${yy}-${String(mm).padStart(2, "0")}`,
            income: ti,
            expense: te,
            balance: Number((r as { balance?: unknown }).balance ?? ti - te),
          }
        }
        break
      }
    }
  }

  let coherence: FinanceModuleMeta["coherence"] = null
  if (operativoCurrent.length > 0) {
    let bridgeEntries: MonthBridgeEntryLite[] = []
    let hintEma: number | null = null
    try {
      const [bridgeRes, hintEmaResolved] = await Promise.all([
        supabase
          .from("household_finance_month_bridge_entries")
          .select("id, bridge_kind, amount_cop, label")
          .eq("household_id", householdId)
          .eq("year", y)
          .eq("month", mo)
          .order("created_at", { ascending: true }),
        fetchReconciliationHintEma(supabase, householdId, HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA),
      ])
      hintEma = hintEmaResolved
      for (const r of bridgeRes.data ?? []) {
        const id = typeof r.id === "string" ? r.id : ""
        const kind = r.bridge_kind === "other" ? "other" : "kpi_structural"
        const amount = Number(r.amount_cop)
        const label = typeof r.label === "string" ? r.label : ""
        if (id && Number.isFinite(amount)) {
          bridgeEntries.push({ id, bridge_kind: kind, amount_cop: amount, label })
        }
      }
    } catch (e) {
      console.warn("FINANCE_MONTH_STATE: puentes/hints no disponibles", e)
      bridgeEntries = []
      hintEma = null
    }

    coherence = buildCompleteMonthFinanceCoherence(
      operativoCurrent,
      operativoPrevious,
      catalogRows,
      bridgeEntries,
      hintEma,
    )
  }

  const meta: FinanceModuleMeta = {
    selectedMonth: month,
    lastTransactionDate,
    lastTransactionUpdatedAt,
    transactionsInSelectedMonth: operativoCurrent.length,
    kpiSource,
    kpiHasSignal,
    reference,
    coherence,
  }

  return {
    overview,
    opex,
    incomeForMetrics,
    snapshotKpiNotice,
    usedSnapshotForKpi,
    txMagBeforeMerge,
    snapMag,
    hasOperativoCatalog,
    catalogRows,
    transactionsInSelectedMonth: operativoCurrent.length,
    meta,
  }
}
