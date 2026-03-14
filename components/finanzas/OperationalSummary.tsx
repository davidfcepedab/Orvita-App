"use client"

import { detectarAnomalias, OperationalCategory } from "@/lib/utils/financialMetrics"

interface Props {
  categories: OperationalCategory[]
}

export default function OperationalSummary({ categories }: Props) {
  const anomalias = detectarAnomalias(categories)

  const items = [
    {
      label: "Sobre ejecución",
      count: anomalias.overBudget,
      color: "text-rose-600",
      bg: "bg-rose-50",
      icon: "⚠️",
    },
    {
      label: "Cambios fuertes (mes anterior)",
      count: anomalias.highDelta,
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: "📈",
    },
    {
      label: "Bajo uso (<10%)",
      count: anomalias.lowUsage,
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: "📊",
    },
    {
      label: "Sin gasto (pero tenían antes)",
      count: anomalias.zeroGasto,
      color: "text-slate-600",
      bg: "bg-slate-50",
      icon: "❓",
    },
  ]

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        🔍 Resumen Operativo del Mes
      </h3>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${item.bg} flex items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span className="text-sm text-slate-700">{item.label}</span>
            </div>
            <span className={`font-bold text-lg ${item.color}`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {anomalias.overBudget > 0 && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-700 font-medium">
            🚨 Atención: {anomalias.overBudget} categoría(s) en sobre ejecución.
            Revisa prioritariamente.
          </p>
        </div>
      )}
    </div>
  )
}
