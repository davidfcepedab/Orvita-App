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

interface Subcategory {
  name: string
  total: number
}

interface Category {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  budget?: number
  subcategories?: Subcategory[]
}

interface CategoriesData {
  structuralCategories?: Category[]
  totalFixed?: number
  totalVariable?: number
  previousTotalFixed?: number
  previousTotalVariable?: number
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()

  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)

  if (!finance) return null
  const { month } = finance

  useEffect(() => {
    if (!month) return
    fetch(`/api/finanzas/categories?month=${month}`)
      .then(res => res.json())
      .then(setData)
  }, [month])

  if (!data) return null

  const {
    structuralCategories = [],
    totalFixed = 0,
    totalVariable = 0,
    previousTotalFixed = 0,
    previousTotalVariable = 0,
  } = data

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

  const previousTotal =
    Math.abs(previousTotalFixed) + Math.abs(previousTotalVariable)

  const globalDelta = structuralTotal - previousTotal

  const globalDeltaPct =
    previousTotal === 0
      ? structuralTotal > 0 ? 100 : 0
      : (globalDelta / previousTotal) * 100

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.abs(value))

  const fixedCategories = structuralCategories
    .filter(c => c.type === "fixed")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = structuralCategories
    .filter(c => c.type === "variable")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const toggleCategory = (name: string) => {
    setExpanded(prev => (prev === name ? null : name))
  }

  const navigateToTransactions = (categoryName: string) => {
    router.push(
      `/finanzas/transactions?month=${encodeURIComponent(month)}&category=${encodeURIComponent(categoryName)}`
    )
  }

  const today = new Date().getDate()

  return (
    <div className="space-y-8">

      {/* ================= */}
      {/* BOTÓN MODO ANÁLISIS */}
      {/* ================= */}
      <div className="flex justify-end">
        <button
          onClick={() => setAdvanced(!advanced)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            advanced
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {advanced ? "✓ Modo análisis" : "Modo análisis"}
        </button>
      </div>

      {/* ================= */}
      {/* BLOQUE SUPERIOR  */}
      {/* ================= */}

      <div className="text-center space-y-2">
        <p className="text-3xl font-bold text-gray-900">
          ${formatMoney(structuralTotal)}
        </p>

        <p
          className={`text-sm font-medium ${
            globalDelta === 0
              ? "text-gray-500"
              : globalDelta > 0
              ? "text-rose-500"
              : "text-blue-600"
          }`}
        >
          {globalDelta > 0 && "↑ "}
          {globalDelta < 0 && "↓ "}
          {globalDelta === 0
            ? "Sin variación vs mes anterior"
            : `${Math.abs(globalDeltaPct).toFixed(1)}% vs mes anterior`}
        </p>
      </div>

      {/* ================= */}
      {/* SECCIONES         */}
      {/* ================= */}

      {[{
        title: "Movimientos Fijos",
        items: fixedCategories,
        clusterBase: absFixed,
        barColor: "bg-rose-400",
      },{
        title: "Movimientos Variables",
        items: variableCategories,
        clusterBase: absVariable,
        barColor: "bg-blue-500",
      }].map(section => (
        <div key={section.title} className="space-y-4">

          <h2 className="text-xl font-semibold">
            {section.title}
          </h2>

          {section.items.map(cat => {

            const spent = Math.abs(cat.total)
            const budget = cat.budget ?? 0
            const previous = Math.abs(cat.previousTotal ?? 0)

            const delta = spent - previous
            const deltaPct =
              previous === 0
                ? spent > 0 ? 100 : 0
                : (delta / previous) * 100

            const hasSubcategories =
              Array.isArray(cat.subcategories) &&
              cat.subcategories.length > 0

            const percent =
              section.clusterBase > 0
                ? (spent / section.clusterBase) * 100
                : 0

            const usagePercent =
              budget === 0 ? 0 : (spent / budget) * 100

            const difference = spent - budget

            const alertOverExecution =
              advanced && usagePercent > 120

            const alertEarlyMonth =
              advanced && today < 15 && usagePercent > 50

            return (
              <div
                key={cat.name}
                className="card p-4 bg-white rounded-lg border border-gray-200 space-y-3"
              >

                {/* HEADER */}
                <div className="flex justify-between items-center gap-4">

                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="font-medium">
                      {cat.name}
                    </span>

                    {hasSubcategories && (
                      <span
                        className={`text-sm transition-transform ${
                          expanded === cat.name ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => navigateToTransactions(cat.name)}
                    className="font-semibold hover:text-blue-600 hover:underline"
                  >
                    -${formatMoney(cat.total)}
                  </button>

                </div>

                {/* DELTA (solo análisis) */}
                {advanced && delta !== 0 && (
                  <div className={`text-xs ${
                    delta > 0 ? "text-rose-500" : "text-blue-600"
                  }`}>
                    {delta > 0 ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}%
                    {" "}(${formatMoney(Math.abs(delta))})
                  </div>
                )}

                {/* Barra cluster */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${section.barColor} h-2 rounded-full`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                {/* Presupuesto */}
                {budget > 0 && (
                  <div className="text-sm space-y-1">

                    <div className="flex justify-between">
                      <span>Presupuesto</span>
                      <span>${formatMoney(budget)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>
                        {difference > 0 ? "Sobre ejecución" : "Sub ejecución"}
                      </span>
                      <span className={
                        difference > 0 ? "text-rose-600" : "text-emerald-600"
                      }>
                        {difference > 0 ? "+" : "-"}
                        ${formatMoney(Math.abs(difference))}
                      </span>
                    </div>

                    {advanced && (
                      <div className="text-xs text-gray-600">
                        Uso {usagePercent.toFixed(0)}%
                      </div>
                    )}

                    {alertOverExecution && (
                      <div className="text-xs text-rose-600">
                        ⚠ Sobre ejecución crítica (+20%)
                      </div>
                    )}

                    {alertEarlyMonth && (
                      <div className="text-xs text-amber-600">
                        ⚠ 50% consumido antes del día 15
                      </div>
                    )}

                  </div>
                )}

                {/* Subcategorías */}
                {expanded === cat.name && hasSubcategories && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {cat.subcategories!.map(sub => (
                      <button
                        key={sub.name}
                        onClick={() =>
                          router.push(
                            `/finanzas/transactions?month=${encodeURIComponent(month)}&category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`
                          )
                        }
                        className="w-full flex justify-between text-sm hover:text-blue-600"
                      >
                        <span>• {sub.name}</span>
                        <span>-${formatMoney(sub.total)}</span>
                      </button>
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
