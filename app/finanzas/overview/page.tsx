"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
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

const subscriptionItems = [
  { name: "Figma", amount: "$15" },
  { name: "ChatGPT Plus", amount: "$20" },
  { name: "GitHub Copilot", amount: "$10" },
  { name: "Equinox Gym", amount: "$180" },
  { name: "Spotify", amount: "$10" },
]

const obligations = [
  { name: "Rent & Utilities", due: "2026-03-26", amount: "$2400", color: "var(--color-accent-danger)" },
  { name: "Car Insurance", due: "2026-03-30", amount: "$120", color: "var(--color-accent-warning)" },
  { name: "Internet", due: "2026-04-10", amount: "$80", color: "var(--color-accent-health)" },
]

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
    return <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>Inicializando...</div>
  }

  if (loading) {
    return <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando datos...</div>
  }

  if (error) {
    return (
      <div style={{ padding: "var(--spacing-md)", borderRadius: "var(--radius-card)", border: "0.5px solid var(--color-border)", color: "var(--color-accent-danger)" }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Error al cargar datos</p>
        <p style={{ margin: "4px 0 0", fontSize: "12px" }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return <div style={{ padding: "var(--spacing-lg)", textAlign: "center", color: "var(--color-text-secondary)" }}>No hay datos disponibles para este mes</div>
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
    `${Math.round(value / 1_000_000)}k`

  return (
    <AppShell moduleLabel="Finance Module" moduleTitle="Capital Operations" showSidebar={false}>
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Capital Operations</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Liquidity flow, burn rate, and strategic financial decisions
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            { label: "Current Liquidity", value: `$${formatMoney(ingresos)}`, sub: "+12% vs last month", accent: "var(--color-accent-health)" },
            { label: "Net Cash Flow", value: `+$${formatMoney(flujo_total)}`, sub: "$12,800 in / $8,940 out", accent: "var(--color-accent-primary)" },
            { label: "Burn Rate", value: `${(runway / 2).toFixed(1)} mo`, sub: "Runway at current spend", accent: "var(--color-text-primary)" },
            { label: "Debt-to-Income", value: "23%", sub: "Healthy ratio", accent: "var(--color-accent-health)" },
          ].map((metric) => (
            <Card key={metric.label} hover>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>{metric.label}</p>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: metric.accent }}>{metric.value}</p>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>{metric.sub}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              5-Week Cash Flow Analysis
            </p>
            <div style={{ width: "100%", height: "260px" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Monthly Subscriptions Burn
              </p>
              {subscriptionItems.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                  <span style={{ fontSize: "13px" }}>{item.name}</span>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{item.amount}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Fixed Obligations (Due Dates)
              </p>
              {obligations.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: item.color }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "13px" }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>Due {item.due}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{item.amount}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
