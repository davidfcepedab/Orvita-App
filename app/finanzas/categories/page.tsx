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

  useEffect(() => {
    if (!month) return
    fetch(`/api/finanzas/categories?month=${month}`)
      .then(res => res.json())
      .then(setData)
  }, [month])

  if (!finance) return null
  if (!data) return null

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

          {section.items.map(cat => {

            const spent = Math.abs(cat.total)
            const previous = Math.abs(cat.previousTotal ?? 0)
            const delta = spent - previous

            const hasSubcategories =
              cat.subcategories && cat.subcategories.length > 0

            return (
              <div
                key={cat.name}
                className="bg-white p-4 rounded-2xl shadow border"
              >

                <div className="flex justify-between items-center">

                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center gap-2"
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
