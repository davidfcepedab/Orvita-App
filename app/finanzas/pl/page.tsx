"use client"

import { FinanzasPlCfoView } from "@/app/finanzas/_components/FinanzasPlCfoView"
import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import {
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
  financeViewRootClass,
} from "@/app/finanzas/_components/financeChrome"
import { cn } from "@/lib/utils"

export default function FinanzasPlPage() {
  return (
    <div className={cn(financeViewRootClass, financePlStackClass)}>
      <div className="space-y-8 sm:space-y-10 lg:space-y-12">
        <FinanzasPlCfoView />
        <section aria-labelledby="pl-detail-heading" className="w-full min-w-0 space-y-2">
          <h2 id="pl-detail-heading" className={financeSectionEyebrowClass}>
            Detalle del mes
          </h2>
          <p className={financeSectionIntroClass}>
            Desglose por líneas y, si hace falta, ajustes para cuadrar números con tus categorías.
          </p>
          <FinanzasPlDashboard omitStrategicHero />
        </section>
      </div>
    </div>
  )
}
