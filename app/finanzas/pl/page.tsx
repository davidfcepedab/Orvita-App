"use client"

import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import { FinanzasPlStrategicBlock } from "@/app/finanzas/_components/FinanzasPlStrategicBlock"
import { FinanceViewHeader } from "@/app/finanzas/_components/FinanceViewHeader"
import { financeViewRootClass } from "@/app/finanzas/_components/financeChrome"
import { FINANCE_PL_PAGE_SUBTITLE } from "@/lib/finanzas/financeModuleCopy"

export default function FinanzasPlPage() {
  return (
    <div className={financeViewRootClass}>
      <FinanceViewHeader kicker="Conciliación" title="Estado de resultados (P&L)" subtitle={FINANCE_PL_PAGE_SUBTITLE} />
      <div className="space-y-10 sm:space-y-12">
        <FinanzasPlStrategicBlock />
        <FinanzasPlDashboard />
      </div>
    </div>
  )
}
