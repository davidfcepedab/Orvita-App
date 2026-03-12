"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"

interface InsightsResponse {
  score?: number
  insight?: { type: string; message: string; all?: string[] }
  stability?: {
    stabilityIndex: number
    status: "green" | "yellow" | "red"
    scoreOperativo: number
    scoreLiquidez: number
    scoreRiesgo: number
  }
  prediction?: { projection: { month: string; projectedBalance: number }[] }
  error?: string
}

export default function FinanzasInsights() {
  const finance = useFinance()

  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  const { month } = finance

  useEffect(() => {
    if (!month) {
      setData(null)
      return
    }

    const fetchInsights = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/finanzas/insights?month=${encodeURIComponent(month)}`
        )

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json = await response.json()

        if (json.error) {
          throw new Error(json.error)
        }

        setData(json.data as InsightsResponse)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [month])

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando insights...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar insights</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Sin insights disponibles para este período.</p>
      </div>
    )
  }

  const { score, insight, stability, prediction } = data

  const stabilityColor = {
    green: "text-emerald-600",
    yellow: "text-amber-600",
    red: "text-rose-600",
  }

  const stabilityBg = {
    green: "bg-emerald-50 border-emerald-200",
    yellow: "bg-amber-50 border-amber-200",
    red: "bg-rose-50 border-rose-200",
  }

  return (
    <div className="space-y-6">
      {/* SCORE FINANCIERO */}
      {score !== undefined && (
        <div className="card p-6 bg-white border border-gray-200 text-center">
          <p className="text-xs uppercase text-gray-500 tracking-wide">
            Score Financiero
          </p>
          <p className={`text-5xl font-bold mt-3 ${
            score >= 70 ? "text-emerald-600" :
            score >= 40 ? "text-amber-600" :
            "text-rose-600"
          }`}>
            {score}
          </p>
          <p className="text-sm text-gray-500 mt-2">sobre 100</p>
        </div>
      )}

      {/* INSIGHT PRINCIPAL */}
      {insight && (
        <div className={`rounded-lg p-4 border ${
          insight.type === "alert"
            ? "bg-rose-50 border-rose-200 text-rose-700"
            : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          <p className="font-medium text-sm">{insight.message}</p>
          {insight.all && insight.all.length > 1 && (
            <ul className="mt-2 space-y-1">
              {insight.all.slice(1).map((msg, i) => (
                <li key={i} className="text-xs opacity-80">• {msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ESTABILIDAD */}
      {stability && (
        <div className={`card p-4 border ${stabilityBg[stability.status]}`}>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Índice de Estabilidad
            </p>
            <p className={`text-2xl font-bold ${stabilityColor[stability.status]}`}>
              {stability.stabilityIndex}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-gray-500">Operativo</p>
              <p className="font-semibold mt-1">{stability.scoreOperativo}</p>
            </div>
            <div>
              <p className="text-gray-500">Liquidez</p>
              <p className="font-semibold mt-1">{stability.scoreLiquidez}</p>
            </div>
            <div>
              <p className="text-gray-500">Riesgo</p>
              <p className="font-semibold mt-1">{stability.scoreRiesgo}</p>
            </div>
          </div>
        </div>
      )}

      {/* PROYECCIÓN */}
      {prediction?.projection && prediction.projection.length > 0 && (
        <div className="card p-4 bg-white border border-gray-200">
          <p className="text-xs uppercase text-gray-500 tracking-wide mb-3">
            Proyección de Balance (3 meses)
          </p>
          <div className="space-y-2">
            {prediction.projection.map((p) => (
              <div key={p.month} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Mes {p.month}</span>
                <span className={`font-semibold ${
                  p.projectedBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  ${Math.abs(p.projectedBalance).toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
