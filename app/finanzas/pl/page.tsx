"use client"

import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import { FinanceViewHeader } from "@/app/finanzas/_components/FinanceViewHeader"
import { financeViewRootClass } from "@/app/finanzas/_components/financeChrome"
import { FINANCE_MODULE_STRAPLINE } from "@/lib/finanzas/financeModuleCopy"

export default function FinanzasPlPage() {
  return (
    <div className={financeViewRootClass}>
      <FinanceViewHeader kicker="Conciliación" title="Estado de resultados (P&L)" subtitle={FINANCE_MODULE_STRAPLINE} />
      <FinanzasPlDashboard />
    </div>
  )
}
