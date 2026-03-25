"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../_hooks/useFinance"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts"

interface MonthlyRow {
  month: string
  ingresos: number
  gasto_operativo: number
  flujo: number
}

interface OverviewData {
  ingresos: number
  flujo_total: number
  liquidez: number
  runway: number
  monthlyData: MonthlyRow[]
}

interface OverviewResponse {
  success: boolean
  data?: OverviewData
  error?: string
}

export default function FinanzasOverview() {
  const finance = useFinance()
  const month = finance?.month ?? ""

  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!month) {
      setData(null)
      return
    }

    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/finanzas/overview?month=${encodeURIComponent(month)}`
        )

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        const json: OverviewResponse = await response.json()

        if (!json.success) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json.data ?? null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error desconocido"
        setError(message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [month])

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        Inicializando...
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando datos...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar datos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay datos disponibles para este mes
      </div>
    )
  }

  const { ingresos, flujo_total, liquidez, runway, monthlyData } = data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  const formatMillions = (value: number) =>
    `${Math.round(value / 1_000_000)}M`

  const getRunwayColor = (value: number) => {
    if (value < 3) return "text-red-600"
    if (value < 6) return "text-amber-600"
    return "text-green-600"
  }

  const getRunwayBg = (value: number) => {
    if (value < 3) return "bg-red-50 border-red-200"
    if (value < 6) return "bg-amber-50 border-amber-200"
    return "bg-green-50 border-green-200"
  }

  const getFlujoColor = (value: number) =>
    value >= 0 ? "text-green-600" : "text-red-600"

  const getFlujoBg = (value: number) =>
    value >= 0
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200"

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-lg font-semibold text-green-600 mt-2">
            ${formatMoney(ingresos)}
          </p>
        </div>

        <div className={`p-4 border rounded-lg ${getFlujoBg(flujo_total)}`}>
          <p className="text-xs text-gray-500">Flujo Total</p>
          <p className={`text-lg font-semibold mt-2 ${getFlujoColor(flujo_total)}`}>
            ${formatMoney(flujo_total)}
          </p>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">Liquidez</p>
          <p className="text-lg font-semibold text-blue-600 mt-2">
            ${formatMoney(liquidez)}
          </p>
        </div>

        <div className={`p-4 border rounded-lg ${getRunwayBg(runway)}`}>
          <p className="text-xs text-gray-500">Runway</p>
          <p className={`text-lg font-semibold mt-2 ${getRunwayColor(runway)}`}>
            {runway.toFixed(1)} meses
          </p>
        </div>
      </div>

      {monthlyData?.length > 0 ? (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm text-gray-500 mb-4">
            Ingresos vs Gasto Operativo vs Flujo (6 meses)
          </h3>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatMillions} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={2} />

                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#16A34A"
                  strokeWidth={3}
                  dot={false}
                  name="Ingresos"
                />

                <Line
                  type="monotone"
                  dataKey="gasto_operativo"
                  stroke="#DC2626"
                  strokeWidth={3}
                  dot={false}
                  name="Gasto Operativo"
                />

                <Line
                  type="monotone"
                  dataKey="flujo"
                  stroke="#6B7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Flujo"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
          No hay datos de histórico disponibles
        </div>
      )}
    </div>
  )
}
