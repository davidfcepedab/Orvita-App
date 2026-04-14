"use client"

import { FinanzasPlCfoView } from "@/app/finanzas/_components/FinanzasPlCfoView"
import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import { FinanceViewHeader } from "@/app/finanzas/_components/FinanceViewHeader"
import { financePlStackClass, financeViewRootClass } from "@/app/finanzas/_components/financeChrome"
import { FINANCE_PL_PAGE_SUBTITLE } from "@/lib/finanzas/financeModuleCopy"
import { cn } from "@/lib/utils"

export default function FinanzasPlPage() {
  return (
    <div className={cn(financeViewRootClass, financePlStackClass)}>
      <FinanceViewHeader kicker="Capital" title="P&L — Centro de control" subtitle={FINANCE_PL_PAGE_SUBTITLE} />
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        <FinanzasPlCfoView />
        <section aria-labelledby="pl-detail-heading" className="space-y-3">
          <h2 id="pl-detail-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
            Detalle contable y conciliación
          </h2>
          <p className="max-w-prose text-xs text-orbita-secondary sm:text-sm">
            Partidas, brechas KPI ↔ mapa y puentes. Misma base contable de la vista CFO, en formato de auditoría.
          </p>
          <FinanzasPlDashboard omitStrategicHero />
        </section>
      </div>
    </div>
  )
}
