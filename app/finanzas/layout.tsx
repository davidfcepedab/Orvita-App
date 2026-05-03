"use client"

import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Brain,
  FileSearch,
  Landmark,
  LayoutDashboard,
  Layers,
  ListTree,
} from "lucide-react"
import { ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FinanceProvider, useFinance } from "./FinanceContext"
import {
  financeModuleHeroTaglineClass,
  financeModuleSubnavEmbeddedClass,
  financeModuleSubnavEmbeddedStyle,
  financeSectionEyebrowClass,
  financeSubnavTabClass,
} from "./_components/financeChrome"
import { FinanceDataLineBanner, FinanceLedgerAlerts } from "./FinanceDataLineBanner"
import { FinanceHeroMonthControl } from "./_components/FinanceHeroMonthControl"
import { Card } from "@/src/components/ui/Card"
import { cn } from "@/lib/utils"

const FINANCE_MODULE_TABS: readonly { name: string; path: string; Icon: LucideIcon }[] = [
  { name: "Resumen", path: "/finanzas/overview", Icon: LayoutDashboard },
  { name: "P&L", path: "/finanzas/pl", Icon: BarChart3 },
  { name: "Movimientos", path: "/finanzas/transactions", Icon: ListTree },
  { name: "Categorías", path: "/finanzas/categories", Icon: Layers },
  { name: "Cuentas", path: "/finanzas/cuentas", Icon: Landmark },
  { name: "Perspectivas", path: "/finanzas/insights", Icon: Brain },
  { name: "Auditoría", path: "/finanzas/audit", Icon: FileSearch },
]

function FinanzasLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const finance = useFinance()

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando finanzas...</p>
      </div>
    )
  }

  const { month, setMonth } = finance

  const navigateFinanceTab = (path: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      p.set("month", month)
    }
    const q = p.toString()
    router.push(q ? `${path}?${q}` : path)
  }

  return (
    <div className="orbita-page-stack mx-auto min-w-0 w-full max-w-[min(76rem,calc(100vw-1.5rem))] space-y-2 sm:space-y-3">
      <Card
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl border-[color-mix(in_srgb,var(--color-border)_34%,transparent)] sm:rounded-[22px]",
          "max-sm:pr-[max(0.75rem,env(safe-area-inset-right,0px))]",
        )}
        style={{
          background: "color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-alt))",
          borderColor: "color-mix(in srgb, var(--color-border) 42%, transparent)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 6px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div className="flex min-w-0 flex-row items-start justify-between gap-3 px-3 pb-3 pt-3 sm:items-center sm:gap-4 sm:px-4 sm:pb-3 sm:pt-3.5">
          <div className="min-w-0 max-w-full flex-1 space-y-0.5 pr-2">
            <p className={cn("m-0 text-orbita-secondary/90", financeSectionEyebrowClass)}>ORVITA · Capital</p>
            <h1 className="m-0 text-base font-semibold leading-snug tracking-tight text-orbita-primary sm:text-lg">
              Capital operativo
            </h1>
            <p className={financeModuleHeroTaglineClass}>Un mes para todas las pestañas.</p>
          </div>
          <FinanceHeroMonthControl month={month} onChange={setMonth} />
        </div>

        <FinanceDataLineBanner embedded footerRail />

        <FinanceLedgerAlerts embedded />

        <div
          className={financeModuleSubnavEmbeddedClass}
          style={financeModuleSubnavEmbeddedStyle}
          role="tablist"
          aria-label="Secciones de finanzas"
        >
          {FINANCE_MODULE_TABS.map((tab) => {
            const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`)
            const TabIcon = tab.Icon

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigateFinanceTab(tab.path)}
                className={financeSubnavTabClass(active, { subtle: true })}
                aria-current={active ? "page" : undefined}
                role="tab"
                aria-selected={active}
              >
                <TabIcon
                  className={cn(
                    "h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5",
                    active ? "text-[var(--color-accent-finance)]" : "text-orbita-secondary/65",
                  )}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{tab.name}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="min-w-0 touch-pan-y space-y-4 sm:space-y-5 lg:space-y-6">{children}</div>
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
