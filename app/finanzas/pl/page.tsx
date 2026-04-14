"use client"

import { FinanzasPlCfoView } from "@/app/finanzas/_components/FinanzasPlCfoView"
import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import { FinanceViewHeader } from "@/app/finanzas/_components/FinanceViewHeader"
import { financeViewRootClass } from "@/app/finanzas/_components/financeChrome"
import { FINANCE_PL_PAGE_SUBTITLE } from "@/lib/finanzas/financeModuleCopy"

export default function FinanzasPlPage() {
  return (
    <div className={financeViewRootClass}>
      <FinanceViewHeader kicker="Capital" title="P&L — Centro de control" subtitle={FINANCE_PL_PAGE_SUBTITLE} />
      <div className="space-y-12 sm:space-y-14">
        <FinanzasPlCfoView />
        <section aria-labelledby="pl-detail-heading" className="space-y-4">
          <h2 id="pl-detail-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
            Detalle contable y conciliación
          </h2>
          <p className="max-w-prose text-sm text-orbita-secondary">
            Partidas, identidad contable, brechas KPI ↔ mapa y puentes. Misma fuente de datos que la vista CFO de arriba.
          </p>
          <FinanzasPlDashboard omitStrategicHero />
        </section>
      </div>
    </div>
  )
}
