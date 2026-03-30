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
      <div className="p-6 text-center text-gray-500">
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
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Capital</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Capital Operations</h1>
            <p className="mt-2 text-sm text-slate-500">
              Liquidity flow, burn rate, and strategic financial decisions.
            </p>
          </div>
          <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:px-4">
              Periodo activo
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="min-h-[44px] w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 sm:w-auto"
              aria-label="Seleccionar mes"
            />
          </div>
        </div>
      </Card>

      <div className="-mx-1 flex touch-pan-x snap-x snap-mandatory gap-1.5 overflow-x-auto overflow-y-hidden rounded-full border border-slate-200 bg-white/80 p-1.5 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:snap-none">
        {tabs.map((tab) => {
          const active = pathname === tab.path

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className={`min-h-[44px] flex-shrink-0 snap-start px-4 py-2.5 text-xs uppercase tracking-[0.16em] transition sm:min-h-0 sm:py-2 rounded-full whitespace-nowrap ${
                active
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
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
