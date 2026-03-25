"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../_hooks/useFinance"
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
  totalStructural?: number
}

interface CategoriesResponse {
  success: boolean
  data?: CategoriesData
  error?: string
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()
  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"operativa" | "estrategica" | "predictiva">("operativa")

  const month_value = finance?.month

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  useEffect(() => {
    if (!month_value) {
      setData(null)
      return
    }

    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/finanzas/categories?month=${encodeURIComponent(month_value)}`
        )

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: CategoriesResponse = await response.json()

        if (!json.success) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json.data ?? null)
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
  }, [month_value])

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando categorías...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar categorías</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

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
    totalStructural = 0,
  } = data

  if (totalStructural === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">
          No hay movimientos categorizados para este mes.
        </p>
      </div>
    )
  }

  const fixedCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "fixed" && Math.abs(c.total) > 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "variable" && Math.abs(c.total) > 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const fixedPct =
    Math.abs(totalStructural) > 0
      ? Math.round((Math.abs(totalFixed) / Math.abs(totalStructural)) * 100)
      : 0

  const navigateToTransactions = (categoryName: string) => {
    const month = month_value ?? ""
    if (!month) return
    router.push(
      `/finanzas/transactions?month=${encodeURIComponent(month)}&category=${encodeURIComponent(categoryName)}`
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-2 justify-between items-center">
        <div className="flex gap-2">
          {(["operativa", "estrategica", "predictiva"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                viewMode === mode
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {mode === "operativa" && "Operativa"}
              {mode === "estrategica" && "Estrategica"}
              {mode === "predictiva" && "Predictiva"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "estrategica" && (
        <div className="p-6 text-center bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 font-semibold">Vista Estrategica</p>
          <p className="text-sm text-blue-600 mt-2">En desarrollo...</p>
        </div>
      )}

      {viewMode === "predictiva" && (
        <div className="p-6 text-center bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-700 font-semibold">Vista Predictiva</p>
          <p className="text-sm text-purple-600 mt-2">En desarrollo...</p>
        </div>
      )}

      {viewMode === "operativa" && (
        <>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Desglose por Categoria</h2>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 uppercase tracking-wide">Total Estructural</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                ${Math.abs(totalStructural).toLocaleString("es-CO", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {fixedPct}% fijo / {100 - fixedPct}% variable
              </p>
            </div>

            {structuralCategories.map((cat) => (
              <div
                key={cat.name}
                className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{cat.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                      {cat.type === "fixed" ? "Fijo" : "Variable"}
                    </p>
                    {cat.delta !== undefined && (
                      <p className={`text-xs mt-2 ${cat.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                        {cat.delta > 0 ? "+" : ""}{cat.delta.toFixed(0)} vs mes anterior
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      ${Math.abs(cat.total).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

                {cat.budget && cat.budget > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-600">Presupuesto</p>
                      <p className="text-xs font-bold text-slate-700">
                        {cat.budgetUsedPercent?.toFixed(0)}%
                      </p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          cat.budgetStatus === "red"
                            ? "bg-red-500"
                            : cat.budgetStatus === "yellow"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(cat.budgetUsedPercent || 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {expanded === cat.name && cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {cat.subcategories.map((sub, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{sub.name}</span>
                        <span className="font-semibold text-slate-700">
                          ${Math.abs(sub.total).toLocaleString("es-CO", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
