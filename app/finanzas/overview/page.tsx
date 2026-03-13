"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
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
  export default function FinanzasOverview() {
  const finance = useFinance()

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
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: OverviewResponse = await response.json()

        if (!json.success) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json.data ?? null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [month])

    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/finanzas/overview?month=${encodeURIComponent(month)}`
        )

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: OverviewResponse = await response.json()

        if (!json.success) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json.data ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error fetching overview:", err)
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
        <p>Inicializando...</p>
      </div>
    )
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando datos...</p>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar datos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  // Sin datos
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No hay datos disponibles para este mes</p>
      </div>
    )
  }

  const {
    ingresos,
    flujo_total,
    liquidez,
    runway,
    monthlyData,
  } = data

  const formatMoney = (value: number): string =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  const formatMillions = (value: number): string =>
    `${Math.round(value / 1_000_000)}M`

  // Determinar colores basados en valores
  const getFluidezColor = (runway: number): string => {
    if (runway < 3) return "text-red-600"
    if (runway < 6) return "text-amber-600"
    return "text-green-600"
  }

  const getFluidezBg = (runway: number): string => {
    if (runway < 3) return "bg-red-50"
    if (runway < 6) return "bg-amber-50"
    return "bg-green-50"
  }

  const getFluidezBorder = (runway: number): string => {
    if (runway < 3) return "border-red-200"
    if (runway < 6) return "border-amber-200"
    return "border-green-200"
  }

  const getFluidezTextColor = (flujo: number): string => {
    return flujo >= 0 ? "text-green-600" : "text-red-600"
  }

  const getFluidezBgColor = (flujo: number): string => {
    return flujo >= 0 ? "bg-green-50" : "bg-red-50"
  }

  const getFluidezBorderColor = (flujo: number): string => {
    return flujo >= 0 ? "border-green-200" : "border-red-200"
  }

  return (
    <div className="space-y-6">
      {/* KPIs - Mobile First: 2 columnas en mobile, gap pequeño */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ingresos */}
        <div className="card p-4 bg-white border border-gray-200">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-lg font-semibold text-green-600 mt-2">
            ${formatMoney(ingresos)}
          </p>
        </div>

        {/* Flujo Total - Colores dinámicos */}
        <div className={`card p-4 border transition ${
          getFluidezBgColor(flujo_total)
        } ${getFluidezBorderColor(flujo_total)}`}>
          <p className="text-xs text-gray-500">Flujo Total</p>
          <p className={`text-lg font-semibold mt-2 ${
            getFluidezTextColor(flujo_total)
          }`}>
            ${formatMoney(flujo_total)}
          </p>
        </div>

        {/* Liquidez */}
        <div className="card p-4 bg-white border border-gray-200">
          <p className="text-xs text-gray-500">Liquidez</p>
          <p className="text-lg font-semibold text-blue-600 mt-2">
            ${formatMoney(liquidez)}
          </p>
        </div>

        {/* Runway - Colores dinámicos */}
        <div className={`card p-4 border transition ${
          getFluidezBg(runway)
        } ${getFluidezBorder(runway)}`}>
          <p className="text-xs text-gray-500">Runway</p>
          <p className={`text-lg font-semibold mt-2 ${getFluidezColor(runway)}`}>
            {runway.toFixed(1)} meses
          </p>
        </div>
      </div>

      {/* GRÁFICO */}
      {monthlyData && monthlyData.length > 0 ? (
        <div className="card p-4 bg-white border border-gray-200">
          <h3 className="text-sm text-gray-500 mb-4">
            Ingresos vs Gasto Operativo vs Flujo (6 meses)
          </h3>

          <div className="w-full h-64 sm:h-72 md:h-80">
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
        <div className="card p-6 bg-gray-50 border border-gray-200 text-center text-gray-500">
          <p className="text-sm">No hay datos de histórico disponibles</p>
        </div>
      )}
    </div>
  )
}
