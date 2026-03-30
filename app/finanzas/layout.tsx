"use client"

import { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { FinanceProvider, useFinance } from "./FinanceContext"
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
    { name: "Overview", path: "/finanzas/overview" },
    { name: "Movimientos", path: "/finanzas/transactions" },
    { name: "Categorías", path: "/finanzas/categories" },
    { name: "Cuentas", path: "/finanzas/cuentas" },
    { name: "Insights", path: "/finanzas/insights" },
  ]

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
      <Card className="min-w-0 p-3 sm:p-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 max-w-full">
            <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Capital</p>
            <h1 className="mt-2 break-words text-xl font-semibold text-orbita-primary sm:text-2xl">
              Capital Operations
            </h1>
            <p className="mt-2 break-words text-sm leading-snug text-orbita-secondary [overflow-wrap:anywhere]">
              Liquidity flow, burn rate, and strategic financial decisions.
            </p>
          </div>
          <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:max-w-[min(100%,20rem)] sm:flex-row sm:items-stretch sm:gap-3">
            <label className="grid min-w-0 gap-1.5">
              <span className="text-center text-[11px] uppercase tracking-[0.14em] text-orbita-secondary sm:text-left">
                Periodo activo
              </span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="min-h-[44px] w-full min-w-0 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary sm:min-w-[11rem]"
                aria-label="Seleccionar mes"
              />
            </label>
          </div>
        </div>
      </Card>

      <div
        className="flex w-full min-w-0 max-w-full touch-pan-x snap-x snap-mandatory gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-full border border-orbita-border p-1.5 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-x-visible sm:snap-none"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 82%, transparent)",
        }}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.path

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className={`min-h-[44px] flex-shrink-0 snap-start px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] transition sm:min-h-0 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em] rounded-full whitespace-nowrap ${
                active
                  ? "bg-orbita-surface text-orbita-primary shadow-card"
                  : "text-orbita-secondary hover:text-orbita-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.name}
            </button>
          )
        })}
      </div>

      <div className="min-w-0">{children}</div>
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
