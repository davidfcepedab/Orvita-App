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
    { name: "P&L", path: "/finanzas/pl" },
    { name: "Movimientos", path: "/finanzas/transactions" },
    { name: "Categorías", path: "/finanzas/categories" },
    { name: "Cuentas", path: "/finanzas/cuentas" },
    { name: "Perspectivas", path: "/finanzas/insights" },
    { name: "Auditoría", path: "/finanzas/audit" },
  ] as const

  return (
    <div className="min-w-0 max-w-full space-y-2.5 overflow-x-hidden sm:space-y-3">
      <Card className={financeModuleHeroClass}>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 max-w-full flex-1">
            <h1 className="m-0 text-xl font-bold leading-tight tracking-tight text-orbita-primary sm:orbita-large-title sm:leading-none">
              Capital operativo
            </h1>
            <p className="mt-0.5 hidden max-w-prose text-xs leading-snug text-orbita-secondary sm:block">
              Un mismo mes para todo el módulo: elige el periodo aquí; cada pestaña muestra el detalle de esa fecha.
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-orbita-secondary [overflow-wrap:anywhere] sm:hidden">
              Un mes para todo Capital; el selector aplica a todas las pestañas.
            </p>
          </div>
          <label className="grid w-full min-w-0 max-w-full grid-cols-1 gap-0.5 sm:w-auto sm:max-w-[min(100%,22rem)] sm:shrink-0 sm:min-w-[11.5rem]">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary sm:text-[10px] sm:tracking-[0.14em]">
              Mes
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="box-border min-h-[40px] w-full min-w-0 max-w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-2.5 py-1.5 text-sm text-orbita-primary shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_35%,transparent)] sm:min-h-[42px] sm:px-3 sm:py-2"
              aria-label="Seleccionar mes del periodo"
            />
          </label>
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
