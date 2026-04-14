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
import { Card } from "@/src/components/ui/Card"

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
    { name: "Movimientos", path: "/finanzas/transactions" },
    { name: "Categorías", path: "/finanzas/categories" },
    { name: "Cuentas", path: "/finanzas/cuentas" },
    { name: "Perspectivas", path: "/finanzas/insights" },
    { name: "Auditoría", path: "/finanzas/audit" },
  ] as const

  return (
    <div className="min-w-0 max-w-full space-y-2.5 overflow-x-hidden sm:space-y-3">
      <Card className={financeModuleHeroClass}>
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-full">
            <h1 className="orbita-large-title m-0 break-words text-orbita-primary">Capital operativo</h1>
            <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-orbita-secondary [overflow-wrap:anywhere] sm:text-xs sm:leading-snug">
              Liquidez y decisiones según el mes; el detalle sigue abajo.
            </p>
          </div>
          <label className="grid w-full min-w-0 shrink-0 gap-1 sm:w-auto sm:min-w-[11rem]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Mes</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="min-h-[42px] w-full min-w-0 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_35%,transparent)]"
              aria-label="Seleccionar mes del periodo"
            />
          </label>
        </div>
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

      <FinanceDataLineBanner />

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
