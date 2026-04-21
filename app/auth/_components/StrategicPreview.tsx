"use client"

import { Activity, Target } from "lucide-react"

export function StrategicPreview() {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/30 p-4 backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8EA5AB]">Preview estratégico</p>
      <div className="mt-2.5 space-y-2 text-sm text-white">
        <p className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00D4FF]" />
          <span>Flujo Operativo actual</span>
        </p>
        <p className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[#00D4FF]" />
          <span>Palanca #1 del día</span>
        </p>
      </div>
    </div>
  )
}

