"use client"

import { FinanzasPlDashboard } from "@/app/finanzas/_components/FinanzasPlDashboard"
import { FinanceViewHeader } from "@/app/finanzas/_components/FinanceViewHeader"
import { financeViewRootClass } from "@/app/finanzas/_components/financeChrome"

export default function FinanzasPlPage() {
  return (
    <div className={financeViewRootClass}>
      <FinanceViewHeader
        kicker="Conciliación"
        title="Estado de resultados (P&L)"
        subtitle="Una sola lectura: caja → operativo (KPI y mapa de categorías) → cierre con puentes. No reemplaza la pestaña Cuentas (saldos ledger)."
      />
      <FinanzasPlDashboard />
    </div>
  )
}
