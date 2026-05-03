"use client"

import { CashFlowSimulatorSection } from "../cuentas/CashFlowSimulatorSection"
import { SubscriptionsBurnSection } from "../cuentas/SubscriptionsBurnSection"

/**
 * Monta los mismos editores que Cuentas (API / localStorage) sin cambiar de ruta en Resumen.
 * Los modales viven fuera del bloque `hidden` para que el overlay `fixed` siga visible.
 */
export function OverviewCuentasEditorsBridge({
  month,
  supabaseEnabled,
  baselineMonthlyIncome,
  subscriptionFixedMonthly,
  subscriptionsOpenSignal,
  commitmentsOpenSignal,
  onPersist,
}: {
  month: string
  supabaseEnabled: boolean
  baselineMonthlyIncome: number
  subscriptionFixedMonthly: number
  subscriptionsOpenSignal: number
  commitmentsOpenSignal: number
  onPersist: () => void
}) {
  return (
    <>
      <SubscriptionsBurnSection
        supabaseEnabled={supabaseEnabled}
        baselineMonthlyIncome={baselineMonthlyIncome}
        onSubscriptionSimulatorMonthlyChange={() => {}}
        bridgeHost
        accessDeepLinkEditor={false}
        openManageSignal={subscriptionsOpenSignal}
        onSubscriptionsPersisted={onPersist}
      />
      <CashFlowSimulatorSection
        month={month}
        kpis={null}
        supabaseEnabled={supabaseEnabled}
        subscriptionFixedMonthly={subscriptionFixedMonthly}
        onApplyPaymentPlan={() => {}}
        bridgeHost
        accessDeepLinkEditor={false}
        openCommitmentsEditorSignal={commitmentsOpenSignal}
        onCommitmentsPersisted={onPersist}
      />
    </>
  )
}
