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

export default function FinanzasOverview() {
  const { month } = useFinance()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!month) return

    fetch(`/api/finanzas/overview?month=${month}`)
      .then((res) => res.json())
      .then(setData)
  }, [month])

  if (!data) return null

  const {
    ingresos = 0,
    flujo_total = 0,
    monthlyData = [],
    liquidez = 0,
    runway = 0,
  } = data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  const formatMillions = (value: number) => {
    const millions = value / 1_000_000
    return `${millions.toFixed(0)}M`
  }

  const formatTooltip = (value: number) =>
    `$${formatMoney(value)}`

  return (
    <div className="space-y-8">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-lg font-semibold">
            ${formatMoney(ingresos)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500">Flujo Total</p>
          <p className="text-lg font-semibold">
            ${formatMoney(flujo_total)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500">Liquidez</p>
          <p className="text-lg font-semibold">
            ${formatMoney(liquidez)}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs text-gray-500">Runway</p>
          <p className="text-lg font-semibold">
            {runway} meses
          </p>
        </div>
      </div>

      {/* GRÁFICO UNIFICADO */}
      <div className="card p-6">
        <h3 className="text-sm text-gray-500 mb-4">
          Ingresos vs Gasto Operativo vs Flujo (6 meses)
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatMillions} />
            <Tooltip formatter={formatTooltip} />
            <Legend />

            {/* Línea base 0 */}
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
  )
}
