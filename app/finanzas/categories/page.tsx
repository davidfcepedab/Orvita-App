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
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
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

  const fixedPct =
    structuralTotal > 0
      ? Math.round((absFixed / structuralTotal) * 100)
      : 0

  const variablePct = 100 - fixedPct

  const donutData = [
    { name: "Fijos", value: absFixed },
    { name: "Variables", value: absVariable },
  ]

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

  return (
    <div className="space-y-10">

      {/* ===================== */}
      {/* BLOQUE SUPERIOR      */}
      {/* ===================== */}

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

      {/* Totales por cluster */}
      <div className="flex justify-center gap-16 text-center">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-1">
            Movimientos Fijos
          </p>
          <p className="text-xl font-bold text-rose-500">
            ${formatMoney(absFixed)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-1">
            Movimientos Variables
          </p>
          <p className="text-xl font-bold text-blue-600">
            ${formatMoney(absVariable)}
          </p>
        </div>
      </div>

      {/* Donut */}
      <div className="card p-6 bg-white rounded-lg shadow">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
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
      </div>

      {/* Distribución */}
      <div className="text-center text-sm font-semibold space-x-6">
        <span className="text-rose-500">
          Fijos {fixedPct}%
        </span>
        <span className="text-blue-600">
          Variables {variablePct}%
        </span>
      </div>

      {/* Insight estructural */}
      {advanced && (
        <div className="max-w-md mx-auto text-center">
          {fixedPct > 70 && (
            <div className="bg-rose-50 rounded-lg p-4 text-rose-700 text-sm">
              Alta rigidez estructural. {fixedPct}% del gasto es fijo.
            </div>
          )}
          {fixedPct <= 70 && fixedPct > 50 && (
            <div className="bg-amber-50 rounded-lg p-4 text-amber-700 text-sm">
              Estructura equilibrada.
            </div>
          )}
          {fixedPct <= 50 && (
            <div className="bg-blue-50 rounded-lg p-4 text-blue-700 text-sm">
              Buena flexibilidad estructural.
            </div>
          )}
        </div>
      )}

      {/* ===================== */}
      {/* SECCIONES OPERATIVAS */}
      {/* ===================== */}

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

            const percent =
              section.clusterBase > 0
                ? (Math.abs(cat.total) / section.clusterBase) * 100
                : 0

            const previous = cat.previousTotal ?? 0
            const delta = cat.total - previous

            const deltaPct =
              previous === 0
                ? cat.total > 0 ? 100 : 0
                : (delta / previous) * 100

            const hasSubcategories =
              Array.isArray(cat.subcategories) &&
              cat.subcategories.length > 0

            return (
              <div
                key={cat.name}
                className="card p-4 bg-white rounded-lg border border-gray-200 space-y-3"
              >

                {/* HEADER */}
                <div className="flex justify-between items-center gap-4">

                  {/* Nombre + toggle */}
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="font-medium">
                      {cat.name}
                    </span>
                    {hasSubcategories && (
                      <span className="text-xs text-gray-400">
                        {expanded === cat.name ? "▴" : "▾"}
                      </span>
                    )}
                  </button>

                  {/* Monto (navega) */}
                  <button
                    onClick={() => navigateToTransactions(cat.name)}
                    className="text-right"
                  >
                    <p className="font-semibold hover:text-blue-600 hover:underline">
                      -${formatMoney(cat.total)}
                    </p>

                    {advanced && delta !== 0 && (
                      <p className={`text-xs ${
                        delta > 0 ? "text-rose-500" : "text-blue-600"
                      }`}>
                        {delta > 0 ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}%
                      </p>
                    )}
                  </button>

                </div>

                {/* Barra cluster */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${section.barColor} h-2 rounded-full`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                {/* Presupuesto compacto */}
                {cat.budget && (
                  <div className="text-sm text-gray-600">
                    Presupuesto ${formatMoney(cat.budget)}
                  </div>
                )}

                {/* Presupuesto expandido */}
                {advanced && cat.budget && (
                  <div className="text-xs text-gray-600">
                    Uso {Math.round(cat.budgetUsedPercent ?? 0)}%
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

      {/* Toggle análisis */}
      <div className="flex justify-center">
        <button
          onClick={() => setAdvanced(!advanced)}
          className="px-4 py-2 rounded-full bg-indigo-600 text-white"
        >
          {advanced ? "Ocultar análisis" : "Modo análisis"}
        </button>
      </div>

    </div>
  )
}
