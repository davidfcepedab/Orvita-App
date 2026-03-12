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
  delta?: number
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
  subcategories?: Subcategory[]
}

interface CategoriesData {
  structuralCategories?: Category[]
  totalFixed?: number
  totalVariable?: number
  success?: boolean
  error?: string
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()

  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  const { month } = finance

  useEffect(() => {
    if (!month) {
      setData(null)
      return
    }

    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/finanzas/categories?month=${encodeURIComponent(month)}`
        )

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: CategoriesData = await response.json()

        if (!json.success && json.error) {
          throw new Error(json.error)
        }

        setData(json)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error fetching categories:", err)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [month])

  // Estado de carga
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando categorías...</p>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar categorías</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  // Sin datos
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No hay datos disponibles</p>
      </div>
    )
  }

  const {
    structuralCategories = [],
    totalFixed = 0,
    totalVariable = 0,
  } = data

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.abs(value || 0))

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

  // Validar que hay datos
  if (structuralTotal === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">
          No hay movimientos categorizados para este mes.
        </p>
      </div>
    )
  }

  const fixedCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "fixed")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "variable")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

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
    setExpanded((prev) => (prev === name ? null : name))
  }

  const navigateToTransactions = (categoryName: string) => {
    if (!month) return
    router.push(
      `/finanzas/transactions?month=${encodeURIComponent(month)}&category=${encodeURIComponent(categoryName)}`
    )
  }

  return (
    <div className="space-y-8">
      {/* TOGGLE */}
      <div className="flex justify-end">
        <button
          onClick={() => setAdvanced(!advanced)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            advanced
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
          aria-pressed={advanced}
        >
          {advanced ? "✓" : ""} Modo análisis
        </button>
      </div>

      {/* TOTALS SUMMARY */}
      <div className="flex justify-center gap-16 text-center mb-8">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-1">
            Movimientos Fijos
          </p>
          <p className="text-2xl font-bold text-rose-500">
            ${formatMoney(absFixed)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-1">
            Movimientos Variables
          </p>
          <p className="text-2xl font-bold text-blue-600">
            ${formatMoney(absVariable)}
          </p>
        </div>
      </div>

      {/* DONUT CHART */}
      <div className="card p-6 bg-white rounded-lg shadow">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                label={({ name, value }) => {
                  const pct = ((value / structuralTotal) * 100).toFixed(0)
                  return `${name} ${pct}%`
                }}
              >
                <Cell fill="#FDA4AF" />
                <Cell fill="#3B82F6" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ANÁLISIS AVANZADO */}
      {advanced && (
        <div className="max-w-md mx-auto space-y-3 text-center mb-8">
          <div className="flex justify-center gap-10 font-semibold text-sm">
            <span className="text-rose-500">
              Fijos: {fixedPct}%
            </span>
            <span className="text-blue-600">
              Variables: {variablePct}%
            </span>
          </div>

          {fixedPct > 70 && (
            <div className="bg-rose-50 rounded-lg p-4 text-rose-700 text-sm leading-relaxed">
              <strong>Alta rigidez estructural.</strong> El gasto fijo limita tu flexibilidad financiera.
            </div>
          )}

          {fixedPct <= 70 && fixedPct > 50 && (
            <div className="bg-amber-50 rounded-lg p-4 text-amber-700 text-sm leading-relaxed">
              <strong>Estructura equilibrada.</strong> Mantén control sobre tus gastos fijos.
            </div>
          )}

          {fixedPct <= 50 && (
            <div className="bg-blue-50 rounded-lg p-4 text-blue-700 text-sm leading-relaxed">
              <strong>Excelente flexibilidad estructural.</strong> Tu distribución de gastos te permite adaptarte.
            </div>
          )}
        </div>
      )}

      {/* SECCIONES DE CATEGORÍAS */}
      {[
        {
          title: "Movimientos Fijos",
          items: fixedCategories,
          clusterBase: absFixed,
          barColor: "bg-rose-400",
          isEmpty: fixedCategories.length === 0,
        },
        {
          title: "Movimientos Variables",
          items: variableCategories,
          clusterBase: absVariable,
          barColor: "bg-blue-500",
          isEmpty: variableCategories.length === 0,
        },
      ].map((section) => (
        <div key={section.title} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {section.title}
          </h2>

          {section.isEmpty ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
              Sin categorías registradas
            </div>
          ) : (
            <div className="space-y-3">
              {section.items.map((cat) => {
                const percent =
                  section.clusterBase > 0
                    ? (Math.abs(cat.total) / section.clusterBase) * 100
                    : 0

                const hasSubcategories =
                  Array.isArray(cat.subcategories) &&
                  cat.subcategories.length > 0

                // Delta comparison
                const hasDelta = cat.delta !== undefined && cat.delta !== 0
                const isDeltaNegative = hasDelta && cat.delta < 0
                const deltaPercent = hasDelta
                  ? Math.abs(((Math.abs(cat.delta) / Math.abs(cat.total - (cat.delta || 0))) * 100).toFixed(1))
                  : 0

                // Budget
                const hasBudget = cat.budget !== undefined && cat.budget > 0
                const budgetPercent = cat.budgetUsedPercent ?? 0
                const budgetStatus = cat.budgetStatus ?? "green"

                return (
                  <div
                    key={cat.name}
                    className="card p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition space-y-3"
                  >
                    {/* HEADER */}
                    <div className="flex justify-between items-center gap-4">
                      {/* NOMBRE + TOGGLE */}
                      <button
                        onClick={() => toggleCategory(cat.name)}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition flex-1 text-left"
                        aria-expanded={expanded === cat.name}
                      >
                        <span className="font-medium text-gray-900">
                          {cat.name}
                        </span>
                        {hasSubcategories && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {expanded === cat.name ? "▴" : "▾"}
                          </span>
                        )}
                      </button>

                      {/* MONTO + DELTA */}
                      <div className="flex flex-col items-end gap-0.5">
                        <button
                          onClick={() => navigateToTransactions(cat.name)}
                          className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition whitespace-nowrap cursor-pointer"
                          title="Ver transacciones de esta categoría"
                        >
                          -${formatMoney(cat.total)}
                        </button>

                        {/* DELTA INDICATOR */}
                        {hasDelta && (
                          <span
                            className={`text-xs font-medium ${
                              isDeltaNegative
                                ? "text-blue-600"
                                : "text-rose-500"
                            }`}
                            title="Comparado con mes anterior"
                          >
                            {isDeltaNegative ? "↓" : "↑"} {deltaPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${section.barColor} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(percent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>

                    {/* PRESUPUESTO - SOLO EN MODO AVANZADO */}
                    {advanced && hasBudget && (
                      <div
                        className={`p-3 rounded-lg space-y-2 border ${
                          budgetStatus === "red"
                            ? "bg-rose-50 border-rose-200"
                            : budgetStatus === "yellow"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">Presupuesto</span>
                          <span
                            className={`font-semibold ${
                              budgetStatus === "red"
                                ? "text-rose-600"
                                : budgetStatus === "yellow"
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            ${formatMoney(cat.budget || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Uso</span>
                          <span
                            className={`font-semibold ${
                              budgetStatus === "red"
                                ? "text-rose-600"
                                : budgetStatus === "yellow"
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {Math.round(budgetPercent)}%
                            {budgetStatus === "red" && " ⚠️"}
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              budgetStatus === "red"
                                ? "bg-rose-500"
                                : budgetStatus === "yellow"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SUBCATEGORÍAS */}
                    {expanded === cat.name && hasSubcategories && (
                      <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Subcategorías
                        </p>
                        {cat.subcategories!.map((sub) => (
                          <button
                            key={sub.name}
                            onClick={() => {
                              if (!month) return
                              router.push(
                                `/finanzas/transactions?month=${encodeURIComponent(month)}&category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`
                              )
                            }}
                            className="w-full flex justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition cursor-pointer py-1 px-2 rounded"
                            title="Ver transacciones de esta subcategoría"
                          >
                            <span>• {sub.name}</span>
                            <span className="font-medium">
                              -${formatMoney(sub.total)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
