"use client"

import { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { FinanceProvider, useFinance } from "./_hooks/useFinance"

function FinanzasLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const finance = useFinance()

  // Mostrar loading mientras se carga el contexto
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
    { name: "Insights", path: "/finanzas/insights" },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div
        className="rounded-3xl p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, #9BE9C0 0%, #6EE7B7 100%)",
        }}
      >
        <p className="text-xs uppercase opacity-70">
          Finanzas
        </p>

        <p className="text-2xl font-semibold mt-2">
          Control Estratégico
        </p>

        <div className="mt-4">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 rounded-xl text-black"
            aria-label="Seleccionar mes"
          />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-3 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.path

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className={`px-4 py-2 rounded-full text-sm transition whitespace-nowrap ${
                active
                  ? "bg-white shadow text-[#166534]"
                  : "bg-white/40 text-[#166534]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.name}
            </button>
          )
        })}
      </div>

      {children}
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
      <FinanzasLayoutContent>
        {children}
      </FinanzasLayoutContent>
    </FinanceProvider>
  )
}
