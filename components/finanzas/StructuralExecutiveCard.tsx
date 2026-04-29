"use client"

import { useMemo } from "react"
import { formatYmLongMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { calcularMetricasEstructurales } from "@/lib/testing/financialMetrics"
import DonutCompact from "./DonutCompact"

interface Props {
  totalStructural: number
  totalFixed: number
  totalVariable: number
  fixedCategoriesCount: number
  variableCategoriesCount: number
  month?: string
}

export default function StructuralExecutiveCard({
  totalStructural,
  totalFixed,
  totalVariable,
  fixedCategoriesCount,
  variableCategoriesCount,
  month,
}: Props) {
  const metricas = calcularMetricasEstructurales(
    totalStructural,
    totalFixed,
    totalVariable,
    fixedCategoriesCount,
    variableCategoriesCount,
  )

  const formattedMonth = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month.trim())) return null
    return formatYmLongMonthYearEsCo(month.trim())
  }, [month])

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            📊 Resultado Estructural
          </p>
          {month && (
            <p className="text-xs text-slate-400 mt-1">
              {formattedMonth}
            </p>
          )}
          <h1 className="text-4xl font-bold text-slate-900 mt-2">
            ${metricas.totalFormatted}
          </h1>
        </div>

        <DonutCompact fixedPct={metricas.fixedPct} variablePct={metricas.variablePct} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            {metricas.fixedPct}% Fijo
          </p>
          <p className="text-lg font-bold text-rose-600">
            {metricas.fixedFormatted}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {metricas.fixedCount} categoría{metricas.fixedCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
            {metricas.variablePct}% Variable
          </p>
          <p className="text-lg font-bold text-blue-600">
            {metricas.variableFormatted}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {metricas.variableCount} categoría{metricas.variableCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700 font-medium">
          ℹ️ Los fijos representan el {metricas.fixedPct}% de tu estructura. 
          Enfócate en controlar los variables para mayor flexibilidad.
        </p>
      </div>
    </div>
  )
}
