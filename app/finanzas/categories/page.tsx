"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { useRouter } from "next/navigation"
import StructuralExecutiveCard from "@/components/finanzas/StructuralExecutiveCard"
import OperationalSummary from "@/components/finanzas/OperationalSummary"
import ImpactIndicator from "@/components/finanzas/ImpactIndicator"
import { calcularEjecucion, formatMoneda } from "@/lib/testing/financialMetrics"

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
  const month = finance?.month ?? ""

  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"operativa" | "estrategica" | "predictiva">("operativa")

  const month_value = finance?.month

  useEffect(() => {
    if (!month_value) return
    fetch(`/api/finanzas/categories?month=${month_value}`)
      .then(res => res.json())
      .then(setData)
  }, [month_value])

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

  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)
  const structuralTotal = absFixed + absVariable

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
    .filter((c): c is Category => c?.type === "fixed" && Math.abs(c.total) > 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "variable" && Math.abs(c.total) > 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const fixedPct =
    structuralTotal > 0
      ? Math.round((absFixed / structuralTotal) * 100)
      : 0

  const navigateToTransactions = (categoryName: string) => {
    router.push(
      `/finanzas/transactions?month=${encodeURIComponent(month_value)}&category=${encodeURIComponent(categoryName)}`
    )
  }

  return (
    <div className="space-y-8">

      {/* TOGGLE VISTAS */}
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
              {mode === "operativa" && "📊 Operativa"}
              {mode === "estrategica" && "📈 Estratégica"}
              {mode === "predictiva" && "🔮 Predictiva"}
            </button>
          ))}
        </div>
      </div>

      {/* VISTAS ALTERNATIVAS */}
      {viewMode === "estrategica" && (
        <div className="p-6 text-center bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 font-semibold">🚀 Vista Estratégica</p>
          <p className="text-sm text-blue-600 mt-2">En desarrollo...</p>
        </div>
      )}

      {viewMode === "predictiva" && (
        <div className="p-6 text-center bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-700 font-semibold">🔮 Vista Predictiva</p>
          <p className="text-sm text-purple-600 mt-2">En desarrollo...</p>
        </div>
      )}

      {/* VISTA OPERATIVA */}
      {viewMode === "operativa" && (
        <>
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

          {/* BLOQUE EJECUTIVO - NUEVO */}
          <StructuralExecutiveCard
            totalStructural={totalStructural}
            totalFixed={totalFixed}
            totalVariable={totalVariable}
            fixedCategories={fixedCategories.length}
            variableCategories={variableCategories.length}
          />

          {/* RESUMEN OPERATIVO - NUEVO */}
          <OperationalSummary categories={structuralCategories} />

          {/* INSIGHT ESTRUCTURAL */}
          {advanced && fixedPct > 70 && (
            <div className="text-center">
              <div className="bg-rose-50 p-3 rounded-lg text-rose-600 text-sm">
                Alta rigidez estructural ({fixedPct}% fijo)
              </div>
            </div>
          )}

          {/* DESGLOSE POR CATEGORÍA */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Desglose por Categoría</h2>

            {structuralCategories.map((cat) => (
              <div
                key={cat.name}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{cat.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                      {cat.type === "fixed" ? "📌 Fijo" : "📊 Variable"}
                    </p>

                    {/* IMPACTO DINÁMICO */}
                    <ImpactIndicator
                      total={cat.total}
                      totalStructural={totalStructural}
                    />
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      ${Math.abs(cat.total).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    {cat.budget && cat.budget > 0 && (() => {
                      const { diff, tipo } = calcularEjecucion(cat.total, cat.budget)
                      const isSobre = tipo === "sobre"
                      return (
                        <p className={`text-xs font-semibold mt-1 ${isSobre ? "text-rose-600" : "text-green-600"}`}>
                          {isSobre ? "⚠️ Sobre" : "✓ Sub"} ${formatMoneda(diff)}
                        </p>
                      )
                    })()}
                  </div>
                </div>

                {/* Budget bar */}
                {cat.budget && cat.budget > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-600">Presupuesto</p>
                      <p className="text-xs font-bold text-slate-700">
                        {cat.budgetUsedPercent?.toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          cat.budgetStatus === "red"
                            ? "bg-rose-500"
                            : cat.budgetStatus === "yellow"
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(cat.budgetUsedPercent || 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Expanded subcategories */}
                {expanded === cat.name && cat.subcategories && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {cat.subcategories.map((sub, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">• {sub.name}</span>
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
