"use client"

import { useEffect, useState } from "react"
import { directionEngine } from "@/lib/PersonaldirectionEngine"
import { getContext } from "@/lib/getContext"

export default function GlobalHeader() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    getContext().then(setData)
  }, [])

  if (!data) return null

  const direction = directionEngine(data)
  const gradient = getGradient(direction.fase)

  const delta = data.delta_global ?? 0

  const deltaColor =
    delta > 0
      ? "text-emerald-100"
      : delta < 0
      ? "text-red-200"
      : "text-white/70"

  return (
    <div className="relative rounded-b-3xl overflow-hidden shadow-lg">
      <div className={`absolute inset-0 ${gradient}`} />
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10 px-6 pt-12 pb-10 text-white">
        <p className="text-xs uppercase tracking-wider opacity-80">
          Score Global
        </p>
        <div className="flex items-center gap-4 mt-3">
          <span className="text-5xl font-bold">
            {data.score_global}
          </span>
          <span className={`text-lg font-semibold ${deltaColor}`}>
            {delta > 0 && "+"}
            {delta}%
          </span>
        </div>
        <div className="mt-6">
          <p className="text-xl font-semibold">
            {direction.fase}
          </p>
          <p className="text-sm opacity-90 mt-2">
            {direction.shortMessage}
          </p>
        </div>
      </div>
    </div>
  )
}

function getGradient(fase: string) {
  switch (fase) {
    case "Expansión":
      return "bg-gradient-to-br from-[#EE3A93]/80 via-[#F472B6]/70 to-[#3FC5BB]/80"
    case "Consolidación":
      return "bg-gradient-to-br from-[#3FC5BB]/80 via-[#7EDCD3]/70 to-[#93C5FD]/80"
    case "Recomposición":
      return "bg-gradient-to-br from-[#FFCFA1]/80 via-[#FDE68A]/70 to-[#FDBA74]/80"
    case "Recuperación":
      return "bg-gradient-to-br from-[#3FC5BB]/70 via-[#A7F3D0]/60 to-[#C7D2FE]/70"
    default:
      return "bg-gradient-to-br from-[#3FC5BB]/80 via-[#7EDCD3]/70 to-[#93C5FD]/80"
  }
}
