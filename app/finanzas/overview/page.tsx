"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
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
  income: number
  expense: number
  net: number
  savingsRate: number
  previousNet: number | null
  deltaNet: number | null
  runway: number
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
          `/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`
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
      <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Inicializando...
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Cargando datos...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: "var(--spacing-md)",
          borderRadius: "var(--radius-card)",
          border: "0.5px solid var(--color-border)",
          color: "var(--color-accent-danger)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Error al cargar datos</p>
        <p style={{ margin: "4px 0 0", fontSize: "12px" }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        No hay datos disponibles para este mes
      </div>
    )
  }

  const { income, net, savingsRate, runway } = data

  const ingresos = income ?? 0
  const flujo_total = net ?? 0
  const liquidez = savingsRate ?? 0
  const monthlyData: MonthlyRow[] = []

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  const formatMillions = (value: number) =>
    `${Math.round(value / 1_000_000)}M`

  const getTone = (value: number) => {
    if (value < 3) return "var(--color-accent-danger)"
    if (value < 6) return "var(--color-accent-warning)"
    return "var(--color-accent-health)"
  }

  const getFlowTone = (value: number) =>
    value >= 0 ? "var(--color-accent-health)" : "var(--color-accent-danger)"

  return (
    <AppShell moduleLabel="Finance Module" moduleTitle="Capital Operations" metaInfo={`Mes: ${month}`}>
      <SectionHeader
        title="Capital Operations"
        description="Liquidez, flujo de caja y decisiones financieras estratégicas."
        gradient
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        {[
          { label: "Ingresos", value: `$${formatMoney(ingresos)}`, tone: "var(--color-accent-health)" },
          { label: "Flujo Total", value: `$${formatMoney(flujo_total)}`, tone: getFlowTone(flujo_total) },
          { label: "Liquidez", value: `$${formatMoney(liquidez)}`, tone: "var(--color-accent-primary)" },
          { label: "Runway", value: `${runway.toFixed(1)} meses`, tone: getTone(runway) },
        ].map((metric) => (
          <div key={metric.label} style={{ gridColumn: "span 3" }}>
            <Card hover>
              <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  {metric.label}
                </p>
                <p style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: metric.tone }}>{metric.value}</p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {monthlyData?.length > 0 ? (
        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Ingresos vs Gasto Operativo vs Flujo (6 meses)
            </h3>

            <div style={{ width: "100%", height: "280px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatMillions} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <Line type="monotone" dataKey="ingresos" stroke="var(--color-accent-health)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gasto_operativo" stroke="var(--color-accent-danger)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="flujo" stroke="var(--color-accent-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>
            No hay datos de histórico disponibles
          </div>
        </Card>
      )}
    </AppShell>
  )
}
