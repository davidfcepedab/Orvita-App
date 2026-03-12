"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
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
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()
  const month = finance?.month ?? ""

  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const month = finance?.month

  useEffect(() => {
    if (!month) return
    fetch(`/api/finanzas/categories?month=${month}`)
      .then(res => res.json())
      .then(setData)
  }, [month])

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

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

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

  // Compute global delta from individual category previousTotal values
  const previousTotal = structuralCategories.reduce(
    (acc, c) => acc + Math.abs(c.previousTotal ?? 0),
    0
  )
  const globalDelta = structuralTotal - previousTotal

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.abs(value))

  const fixedPct =
    structuralTotal > 0
      ? Math.round((absFixed / structuralTotal) * 100)
      : 0

  const fixedCategories = structuralCategories
    .filter(c => c.type === "fixed" && Math.abs(c.total) !== 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = structuralCategories
    .filter(c => c.type === "variable" && Math.abs(c.total) !== 0)
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
    <div className="space-y-8">

      {/* BOTÓN ANÁLISIS */}
      <div className="flex justify-end">
        <button
          onClick={() => setAdvanced(!advanced)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            advanced
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {advanced ? "✓ Análisis activo" : "Modo análisis"}
        </button>
      </div>

      {/* TOTAL GLOBAL */}
      <div className="text-center space-y-2">
        <p className="text-3xl font-bold">
          ${formatMoney(structuralTotal)}
        </p>

        {globalDelta !== 0 && (
          <p className={`text-sm font-medium ${
            globalDelta > 0 ? "text-rose-500" : "text-blue-600"
          }`}>
            {globalDelta > 0 ? "↑" : "↓"}{" "}
            {Math.abs(globalDelta).toLocaleString("es-CO")}
          </p>
        )}
      </div>

      {/* TOTALS SUMMARY: Fijos / Variables */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-rose-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-rose-400 font-medium uppercase tracking-wide">Fijos</p>
          <p className="text-xl font-bold text-rose-500 mt-1">${formatMoney(absFixed)}</p>
          {structuralTotal > 0 && (
            <p className="text-xs text-rose-400 mt-1">{Math.round((absFixed / structuralTotal) * 100)}%</p>
          )}
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Variables</p>
          <p className="text-xl font-bold text-blue-600 mt-1">${formatMoney(absVariable)}</p>
          {structuralTotal > 0 && (
            <p className="text-xs text-blue-400 mt-1">{Math.round((absVariable / structuralTotal) * 100)}%</p>
          )}
        </div>
      </div>

      {/* INSIGHT ESTRUCTURAL */}
      {advanced && (
        <div className="text-center">
          {fixedPct > 70 && (
            <div className="bg-rose-50 p-3 rounded-lg text-rose-600 text-sm">
              Alta rigidez estructural ({fixedPct}% fijo)
            </div>
          )}
        </div>
      )}

      {/* SECCIONES */}
      {[{
        title: "Movimientos Fijos",
        items: fixedCategories,
      },{
        title: "Movimientos Variables",
        items: variableCategories,
      }].map(section => (
        <div key={section.title} className="space-y-4">

          <h2 className="text-xl font-semibold">
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
                const isDeltaNegative = hasDelta && (cat.delta ?? 0) < 0
                const deltaPercent = hasDelta
                  ? Math.round((Math.abs(cat.delta ?? 0) / Math.abs(cat.total - (cat.delta ?? 0))) * 1000) / 10
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
                    <span className="font-medium">{cat.name}</span>
                    {hasSubcategories && (
                      <span>{expanded === cat.name ? "▲" : "▼"}</span>
                    )}
                  </button>

                  <button
                    onClick={() => navigateToTransactions(cat.name)}
                    className="font-semibold"
                  >
                    -${formatMoney(cat.total)}
                  </button>

                </div>

                {advanced && delta !== 0 && (
                  <div className={`text-xs mt-1 ${
                    delta > 0 ? "text-rose-500" : "text-blue-600"
                  }`}>
                    {delta > 0 ? "↑" : "↓"} {formatMoney(Math.abs(delta))}
                  </div>
                )}

                {advanced && cat.budget && cat.budget > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Presupuesto: ${formatMoney(cat.budget)}</span>
                      <span className={
                        cat.budgetStatus === "red"
                          ? "text-red-500"
                          : cat.budgetStatus === "yellow"
                          ? "text-amber-500"
                          : "text-green-600"
                      }>
                        {Math.round(cat.budgetUsedPercent ?? 0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.budgetStatus === "red"
                            ? "bg-red-500"
                            : cat.budgetStatus === "yellow"
                            ? "bg-amber-400"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(cat.budgetUsedPercent ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {expanded === cat.name && hasSubcategories && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {cat.subcategories!.map(sub => (
                      <button
                        key={sub.name}
                        onClick={() =>
                          router.push(
                            `/finanzas/transactions?month=${month}&category=${cat.name}&subcategory=${sub.name}`
                          )
                        }
                        className="w-full flex justify-between text-sm"
                      >
                        <span>{sub.name}</span>
                        <span>-${formatMoney(sub.total)}</span>
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
                )}

              </div>
            )
          })}
        </div>
      ))}

    </div>
  )
}
