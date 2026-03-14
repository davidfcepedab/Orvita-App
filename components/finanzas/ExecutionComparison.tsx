"use client"

import { calcularEjecucion, formatMoneda } from "@/lib/utils/financialMetrics"

interface Props {
  total: number
  budget: number
}

export default function ExecutionComparison({ total, budget }: Props) {
  if (budget === 0) return null

  const { diff, tipo } = calcularEjecucion(total, budget)

  const isSobre = tipo === "sobre"
  const bgColor = isSobre ? "bg-rose-50" : "bg-green-50"
  const textColor = isSobre ? "text-rose-700" : "text-green-700"
  const borderColor = isSobre ? "border-rose-200" : "border-green-200"
  const icon = isSobre ? "⚠️" : "✓"

  return (
    <div className={`mt-3 p-3 rounded-lg border ${bgColor} ${borderColor}`}>
      <p className={`text-sm font-semibold ${textColor}`}>
        {icon} {isSobre ? "Sobre" : "Sub"} ejecución
      </p>
      <p className={`text-xs ${textColor} mt-1`}>
        {isSobre ? "Excediste" : "Queda"} ${formatMoneda(diff)}
      </p>
    </div>
  )
}
