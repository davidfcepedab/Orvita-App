"use client"

import { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { FinanceProvider, useFinance } from "./FinanceContext"
import {
  financeModuleHeroClass,
  financeModuleSubnavClass,
  financeModuleSubnavStyle,
  financeSubnavTabClass,
} from "./_components/financeChrome"
import { FinanceDataLineBanner } from "./FinanceDataLineBanner"
import { FinanceHeroMonthControl } from "./_components/FinanceHeroMonthControl"
import { Card } from "@/src/components/ui/Card"
import { cn } from "@/lib/utils"

function FinanzasLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const finance = useFinance()

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando finanzas...</p>
      </div>
    )
  }

  const { month, setMonth } = finance

  const tabs = [
    { name: "Resumen", path: "/finanzas/overview" },
    { name: "P&L", path: "/finanzas/pl" },
    { name: "Movimientos", path: "/finanzas/transactions" },
    { name: "Categorías", path: "/finanzas/categories" },
    { name: "Cuentas", path: "/finanzas/cuentas" },
    { name: "Perspectivas", path: "/finanzas/insights" },
    { name: "Auditoría", path: "/finanzas/audit" },
  ] as const

  return (
    <div className="min-w-0 max-w-full space-y-2.5 sm:space-y-3">
      <Card
        className={cn(
          financeModuleHeroClass,
          "max-sm:pr-[max(0.75rem,env(safe-area-inset-right,0px))]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-full">
            <h1 className="orbita-large-title m-0 break-words text-orbita-primary">Capital operativo</h1>
            <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-orbita-secondary [overflow-wrap:anywhere] sm:text-xs sm:leading-snug">
              Un mismo mes para todo el módulo: elige el periodo aquí; cada pestaña muestra el detalle de esa fecha.
            </p>
          </div>
          <FinanceHeroMonthControl month={month} onChange={setMonth} />
        </div>
        <FinanceDataLineBanner embedded />
      </Card>

      <div
        className={financeModuleSubnavClass}
        style={financeModuleSubnavStyle}
        role="tablist"
        aria-label="Secciones de finanzas"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`)

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => router.push(tab.path)}
              className={`${financeSubnavTabClass(active)} whitespace-nowrap`}
              aria-current={active ? "page" : undefined}
              role="tab"
              aria-selected={active}
            >
              {tab.name}
            </button>
          )
        })}
      </div>

      <div className="min-w-0 space-y-3 sm:space-y-4">{children}</div>
    </div>
  )
}

export default function FinanzasLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <FinanceProvider>
      <FinanzasLayoutContent>{children}</FinanzasLayoutContent>
    </FinanceProvider>
  )
}
