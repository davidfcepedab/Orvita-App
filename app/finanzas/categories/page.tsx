"use client"

import { useEffect, useMemo, useState } from "react"
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
  success?: boolean
  error?: string
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()

  const [data, setData] = useState<CategoriesData | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!finance) {
    return <div className="p-6 text-center text-gray-500">Inicializando...</div>
  }

  const { month } = finance

  useEffect(() => {
    if (!month) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/finanzas/categories?month=${encodeURIComponent(month)}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError("Error cargando categorías")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [month])

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.abs(value || 0))

  const computed = useMemo(() => {
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

    const previousStructuralTotal =
      Math.abs(previousTotalFixed || 0) +
      Math.abs(previousTotalVariable || 0)

    const structuralDelta =
      previousStructuralTotal !== 0
        ? ((structuralTotal - previousStructuralTotal) / previousStructuralTotal) * 100
        : 0

    const fixedDelta =
      previousTotalFixed !== 0
        ? ((totalFixed - previousTotalFixed) / Math.abs(previousTotalFixed)) * 100
        : 0

    const variableDelta =
      previousTotalVariable !== 0
        ? ((totalVariable - previousTotalVariable) / Math.abs(previousTotalVariable)) * 100
        : 0

    const fixedPct =
      structuralTotal > 0 ? Math.round((absFixed / structuralTotal) * 100) : 0

    const variablePct = 100 - fixedPct

    const structuralStatus =
      fixedPct > 70 ? "red" :
      fixedPct > 55 ? "yellow" :
      "green"

    const fixedCategories = structuralCategories
      .filter(c => c.type === "fixed")
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    const variableCategories = structuralCategories
      .filter(c => c.type === "variable")
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    const top3Impact = [...structuralCategories]
      .sort((a, b) => Math.abs(b.total - (b.previousTotal || 0)) - Math.abs(a.total - (a.previousTotal || 0)))
      .slice(0, 3)

    return {
      structuralTotal,
      absFixed,
      absVariable,
      fixedPct,
      variablePct,
      structuralDelta,
      fixedDelta,
      variableDelta,
      structuralStatus,
      fixedCategories,
      variableCategories,
      top3Impact,
    }
  }, [data])

  if (loading) return <div className="p-6 text-center">Cargando...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!computed) return null

  return (
    <div className="space-y-10">

      {/* RESUMEN GLOBAL */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">
          ${formatMoney(computed.structuralTotal)}
        </h2>
        <p className={`text-sm font-semibold ${
          computed.structuralDelta >= 0 ? "text-rose-500" : "text-blue-600"
        }`}>
          {computed.structuralDelta >= 0 ? "↑" : "↓"} {Math.abs(computed.structuralDelta).toFixed(1)}% vs mes anterior
        </p>
      </div>

      {/* DISTRIBUCIÓN */}
      <div className="card p-6 bg-white rounded-lg shadow">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Fijos", value: computed.absFixed },
                  { name: "Variables", value: computed.absVariable },
                ]}
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

      {/* ANÁLISIS ESTRUCTURAL */}
      <div className="max-w-md mx-auto text-center space-y-3">
        <div className="flex justify-center gap-6 font-semibold text-sm">
          <span className="text-rose-500">
            Fijos: {computed.fixedPct}% ({computed.fixedDelta.toFixed(1)}%)
          </span>
          <span className="text-blue-600">
            Variables: {computed.variablePct}% ({computed.variableDelta.toFixed(1)}%)
          </span>
        </div>

        <div className={`p-4 rounded-lg text-sm ${
          computed.structuralStatus === "red"
            ? "bg-rose-50 text-rose-700"
            : computed.structuralStatus === "yellow"
            ? "bg-amber-50 text-amber-700"
            : "bg-emerald-50 text-emerald-700"
        }`}>
          {computed.structuralStatus === "red" &&
            "Alta rigidez estructural. Reduce gastos fijos."}
          {computed.structuralStatus === "yellow" &&
            "Estructura equilibrada con margen de optimización."}
          {computed.structuralStatus === "green" &&
            "Estructura flexible y saludable."}
        </div>
      </div>

      {/* TOP IMPACTO */}
      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-sm font-semibold uppercase text-gray-500">
          Categorías que explican el cambio
        </h3>
        {computed.top3Impact.map(cat => (
          <div key={cat.name} className="flex justify-between text-sm">
            <span>{cat.name}</span>
            <span className="font-semibold">
              ${formatMoney(cat.total - (cat.previousTotal || 0))}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
