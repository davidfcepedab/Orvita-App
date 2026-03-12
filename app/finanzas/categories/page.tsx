"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useRouter } from "next/navigation"

export default function FinanzasCategories() {
  const { month } = useFinance()
  const router = useRouter()

  const [data, setData] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    if (!month) return
    fetch(`/api/finanzas/categories?month=${month}`)
      .then((res) => res.json())
      .then(setData)
  }, [month])

  if (!data) return null

  const {
    structuralCategories = [],
    totalFixed = 0,
    totalVariable = 0,
  } = data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.abs(value || 0))

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

  const fixedCategories = structuralCategories
    .filter((c: any) => c.type === "fixed")
    .sort((a: any, b: any) =>
      Math.abs(b.total) - Math.abs(a.total)
    )

  const variableCategories = structuralCategories
    .filter((c: any) => c.type === "variable")
    .sort((a: any, b: any) =>
      Math.abs(b.total) - Math.abs(a.total)
    )

  const fixedPct =
    structuralTotal > 0
      ? Math.round((absFixed / structuralTotal) * 100)
      : 0

  const variablePct =
    structuralTotal > 0 ? 100 - fixedPct : 0

  const donutData = [
    { name: "Fijos", value: absFixed },
    { name: "Variables", value: absVariable },
  ]

  const toggleCategory = (name: string) => {
    setExpanded(prev => prev === name ? null : name)
  }

  return (
    <div className="space-y-8">

      {/* TOGGLE */}
      <div className="flex justify-end">
        <button
          onClick={() => setAdvanced(!advanced)}
          className={`px-3 py-1 rounded-full text-sm transition ${
            advanced
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          Modo análisis
        </button>
      </div>

      {/* DONUT */}
      <div className="card p-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              innerRadius={60}
              outerRadius={85}
            >
              <Cell fill="#FDA4AF" />
              <Cell fill="#3B82F6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* SECCIONES */}
      {[{
        title: "Movimientos Fijos",
        items: fixedCategories,
        clusterBase: absFixed,
        barColor: "bg-rose-300"
      },
      {
        title: "Movimientos Variables",
        items: variableCategories,
        clusterBase: absVariable,
        barColor: "bg-blue-500"
      }].map((section) => (
        <div key={section.title} className="space-y-4">

          <h2 className="text-xl font-semibold">
            {section.title}
          </h2>

          {section.items.map((cat: any) => {

            const percent =
              section.clusterBase > 0
                ? (Math.abs(cat.total) /
                    section.clusterBase) * 100
                : 0

            return (
              <div
                key={cat.name}
                className="card p-4 space-y-2"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center">

                  {/* NOMBRE EXPANDE */}
                  <div
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="font-medium">
                      {cat.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {expanded === cat.name ? "▴" : "▾"}
                    </span>
                  </div>

                  {/* MONTO NAVEGA */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(
                        `/finanzas/transactions?month=${month}&category=${encodeURIComponent(cat.name)}`
                      )
                    }}
                    className="font-semibold cursor-pointer hover:underline"
                  >
                    -${formatMoney(cat.total)}
                  </div>

                </div>

                {/* BARRA */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${section.barColor} h-2 rounded-full`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* SUBCATEGORIAS */}
                {expanded === cat.name &&
                  cat.subcategories?.length > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {cat.subcategories.map((sub: any) => (
                        <div
                          key={sub.name}
                          className="flex justify-between text-sm text-gray-600"
                        >
                          <span>• {sub.name}</span>
                          <span>
                            -${formatMoney(sub.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

              </div>
            )
          })}
        </div>
      ))}

    </div>
  )
}
