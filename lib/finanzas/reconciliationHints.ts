import type { SupabaseClient } from "@supabase/supabase-js"

/** EMA de |brecha sin explicar| KPI vs mapa; se actualiza al registrar un puente. */
export const HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA = "kpi_structural_unexplained_ema"

/** EMA del |Δ| al conciliar ledger; tiende a 0 cuando el modelo y el banco coinciden. */
export const HINT_KEY_RECONCILE_DELTA_ABS_EMA = "reconcile_delta_abs_ema_v1"

export async function fetchReconciliationHintEma(
  supabase: SupabaseClient,
  householdId: string,
  hintKey: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("household_finance_reconciliation_hints")
    .select("value_json")
    .eq("household_id", householdId)
    .eq("hint_key", hintKey)
    .maybeSingle()

  const raw = data?.value_json as { ema?: unknown } | undefined
  const ema = typeof raw?.ema === "number" && Number.isFinite(raw.ema) ? raw.ema : null
  return ema
}

/**
 * Suaviza la magnitud típica de brecha restante tras conciliar (α=0,3 hacia el último cierre).
 */
export async function upsertUnexplainedGapEma(
  supabase: SupabaseClient,
  householdId: string,
  observedAbsUnexplained: number,
): Promise<void> {
  const prev = await fetchReconciliationHintEma(supabase, householdId, HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA)
  const absObs = Math.abs(observedAbsUnexplained)
  const ema = prev != null ? 0.7 * prev + 0.3 * absObs : absObs

  await supabase.from("household_finance_reconciliation_hints").upsert(
    {
      household_id: householdId,
      hint_key: HINT_KEY_KPI_STRUCTURAL_UNEXPLAINED_EMA,
      value_json: { ema },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id,hint_key" },
  )
}

/**
 * Aprendizaje de hogar: suaviza la magnitud típica del delta al conciliar (más bajo = mejor alineación modelo↔banco).
 */
export async function upsertReconcileDeltaAbsEma(
  supabase: SupabaseClient,
  householdId: string,
  deltaAbs: number,
): Promise<void> {
  const absObs = Math.abs(deltaAbs)
  const prev = await fetchReconciliationHintEma(supabase, householdId, HINT_KEY_RECONCILE_DELTA_ABS_EMA)
  const ema = prev != null ? 0.85 * prev + 0.15 * absObs : absObs

  await supabase.from("household_finance_reconciliation_hints").upsert(
    {
      household_id: householdId,
      hint_key: HINT_KEY_RECONCILE_DELTA_ABS_EMA,
      value_json: { ema, lastDeltaAbs: absObs },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id,hint_key" },
  )
}
