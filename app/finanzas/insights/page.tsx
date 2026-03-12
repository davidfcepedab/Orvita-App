"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"

interface InsightsData {
  score: number
  insight: {
    fixedRatio: number
    structuralRigidity: "low" | "medium" | "high"
    topCategory: string | null
    overBudgetCategories: string[]
    riskLevel: "stable" | "warning" | "critical"
    alerts: string[]
  }
  stability: {
    scoreOperativo: number
    scoreLiquidez: number
    scoreRiesgo: number
    stabilityIndex: number
    status: "green" | "yellow" | "red"
  }
  prediction: {
    dailyAverage: number
    projectedEndOfMonth: number
    warning: boolean
  }
}

interface InsightsResponse {
  success: boolean
  data: InsightsData
  error?: string
}

export default function FinanzasInsights() {
  const finance = useFinance()

  const [data, setData] = useState<InsightsData | null>(null)
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

        const json: InsightsResponse = await response.json()

        if (!json.success && json.error) {
          throw new Error(json.error)
        }

        setData(json.data)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error fetching insights:", err)
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
        <p>Cargando datos...</p>
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
        <p>No hay datos disponibles para este mes</p>
      </div>
    )
  }

  const { score, insight, stability, prediction } = data

  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-green-600"
    if (s >= 40) return "text-amber-600"
    return "text-red-600"
  }

  const getStatusColor = (status: "green" | "yellow" | "red") => {
    if (status === "green") return "text-green-600"
    if (status === "yellow") return "text-amber-600"
    return "text-red-600"
  }

  const getRiskColor = (risk: "stable" | "warning" | "critical") => {
    if (risk === "stable") return "text-green-600"
    if (risk === "warning") return "text-amber-600"
    return "text-red-600"
  }

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="card p-4 bg-white border border-gray-200">
        <p className="text-xs text-gray-500">Score Financiero</p>
        <p className={`text-3xl font-bold mt-2 ${getScoreColor(score)}`}>
          {score}
          <span className="text-base font-normal text-gray-400"> / 100</span>
        </p>
      </div>

      {/* Stability */}
      <div className="card p-4 bg-white border border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Estabilidad</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Índice</p>
            <p className={`text-lg font-semibold mt-1 ${getScoreColor(stability.stabilityIndex)}`}>
              {stability.stabilityIndex}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estado</p>
            <p className={`text-lg font-semibold mt-1 capitalize ${getStatusColor(stability.status)}`}>
              {stability.status === "green"
                ? "Estable"
                : stability.status === "yellow"
                ? "Precaución"
                : "Riesgo"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Operativo</p>
            <p className="text-base font-medium mt-1">{stability.scoreOperativo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Liquidez</p>
            <p className="text-base font-medium mt-1">{stability.scoreLiquidez}</p>
          </div>
        </div>
      </div>

      {/* Insight estructural */}
      <div className="card p-4 bg-white border border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Análisis Estructural</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Rigidez</p>
            <p className="text-base font-medium mt-1 capitalize">
              {insight.structuralRigidity}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Riesgo</p>
            <p className={`text-base font-medium mt-1 capitalize ${getRiskColor(insight.riskLevel)}`}>
              {insight.riskLevel === "stable"
                ? "Estable"
                : insight.riskLevel === "warning"
                ? "Alerta"
                : "Crítico"}
            </p>
          </div>
          {insight.topCategory && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Categoría principal</p>
              <p className="text-base font-medium mt-1">{insight.topCategory}</p>
            </div>
          )}
        </div>
        {insight.alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            {insight.alerts.map((alert, i) => (
              <p key={i} className="text-xs text-amber-700">
                ⚠ {alert}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Prediction */}
      <div className="card p-4 bg-white border border-gray-200 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Proyección del Mes</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Promedio diario</p>
            <p className="text-base font-medium mt-1">
              ${formatMoney(prediction.dailyAverage)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Proyectado fin de mes</p>
            <p className="text-base font-medium mt-1">
              ${formatMoney(prediction.projectedEndOfMonth)}
            </p>
          </div>
        </div>
        {prediction.warning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700">
              ⚠ Proyección de gasto elevada para este mes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
