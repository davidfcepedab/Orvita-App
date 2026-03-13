"use client"

import { calcularImpacto } from "@/lib/testing/financialMetrics"

interface Props {
  total: number
  totalStructural: number
}

export default function ImpactIndicator({ total, totalStructural }: Props) {
  const impactPct = calcularImpacto(total, totalStructural)

  if (impactPct < 5) return null

  let colorClass = "text-slate-500"
  if (impactPct >= 20) colorClass = "text-rose-600"
  else if (impactPct >= 10) colorClass = "text-amber-600"
  else if (impactPct > 0) colorClass = "text-blue-600"

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            impactPct >= 20
              ? "bg-gradient-to-r from-rose-400 to-rose-600"
              : impactPct >= 10
              ? "bg-gradient-to-r from-amber-400 to-amber-600"
              : "bg-gradient-to-r from-blue-400 to-blue-600"
          }`}
          style={{ width: `${impactPct}%` }}
        />
      </div>
      <p className={`text-xs font-semibold whitespace-nowrap ${colorClass}`}>
        {impactPct}% impacto
      </p>
    </div>
  )
}
