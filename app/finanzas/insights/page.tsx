"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

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

const mockInsights: InsightsResponse = {
  score: 74,
  insight: {
    type: "alert",
    message: "Liquidez controlada, pero el gasto variable subió 12%.",
    all: [
      "Liquidez controlada, pero el gasto variable subió 12%.",
      "Reducir gastos discrecionales durante 2 semanas.",
      "Priorizar ingresos recurrentes vs puntuales.",
    ],
  },
  stability: {
    stabilityIndex: 68,
    status: "yellow",
    scoreOperativo: 72,
    scoreLiquidez: 64,
    scoreRiesgo: 56,
  },
  prediction: {
    projection: [
      { month: "Abr", projectedBalance: 4200000 },
      { month: "May", projectedBalance: 3800000 },
      { month: "Jun", projectedBalance: 4500000 },
    ],
  },
}

export default function FinanzasInsights() {
  const finance = useFinance()

  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const month = finance?.month ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0

  useEffect(() => {
    if (!month) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchInsights = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await financeApiGet(
          `/api/orbita/finanzas/insights?month=${encodeURIComponent(month)}`,
        )

        const json = (await response.json()) as {
          success?: boolean
          data?: InsightsResponse | null
          error?: string
          notice?: string
        }

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setNotice(json.notice ?? null)
        setData((json.data as InsightsResponse) ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [month, capitalEpoch])

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Cargando perspectivas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[var(--radius-card)] border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-danger) 32%, var(--color-border))",
          color: "var(--color-accent-danger)",
        }}
      >
        <p className="font-semibold">Error al cargar perspectivas</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-2 p-6 text-center text-orbita-secondary">
        <p>Sin datos de análisis para este periodo.</p>
        {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
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
    <div className="min-w-0 space-y-5 sm:space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-base font-semibold tracking-tight text-orbita-primary sm:text-lg">Perspectivas</h2>
          <p className="mt-0.5 hidden text-sm text-orbita-secondary sm:block">
            Estabilidad, riesgo y proyección.
          </p>
        </div>
        {notice && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-800">
            {notice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid gap-4 sm:gap-6">
          {score !== undefined && (
            <Card hover className="p-4 sm:p-8">
              <div className="grid gap-3 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
                  Score financiero
                </p>
                <p
                  className={`text-4xl font-semibold sm:text-5xl ${
                    score >= 70
                      ? "text-emerald-600"
                      : score >= 40
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {score}
                </p>
                <p className="text-xs text-orbita-secondary">sobre 100</p>
              </div>
            </Card>
          )}

          <Card hover className="p-4 sm:p-8">
            <div className="grid gap-4">
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
                Índice de estabilidad
              </p>
              {stability ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p
                      className={`text-3xl font-semibold ${
                        stability.status === "green"
                          ? "text-emerald-600"
                          : stability.status === "yellow"
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {stability.stabilityIndex}
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${stabilityBg[stability.status]} ${stabilityColor[stability.status]}`}
                    >
                      {stability.status === "green"
                        ? "estable"
                        : stability.status === "yellow"
                        ? "presión"
                        : "riesgo"}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-orbita-secondary">
                    <div className="flex items-center justify-between">
                      <span>Operativo</span>
                      <span className="font-semibold text-orbita-primary">{stability.scoreOperativo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Liquidez</span>
                      <span className="font-semibold text-orbita-primary">{stability.scoreLiquidez}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Riesgo</span>
                      <span className="font-semibold text-orbita-primary">{stability.scoreRiesgo}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-orbita-secondary">Sin datos</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {insight && (
            <Card hover className="p-4 sm:p-8">
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
                  Insight principal
                </p>
                <p className="break-words text-sm font-medium text-orbita-primary">{insight.message}</p>
                {insight.all && insight.all.length > 1 && (
                  <ul className="mt-2 space-y-1 text-xs text-orbita-secondary">
                    {insight.all.slice(1).map((msg, i) => (
                      <li key={i}>• {msg}</li>
                    ))}
                  </ul>
                )}
                <span
                  className={`mt-2 inline-flex w-fit rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                    insight.type === "alert"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  {insight.type === "alert" ? "Riesgo activo" : "Señal positiva"}
                </span>
              </div>
            </Card>
          )}

          {prediction?.projection && (
            <Card hover className="p-4 sm:p-8">
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
                    Proyección 3 meses
                  </p>
                  <span className="text-xs text-orbita-secondary">Escenario base</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {prediction.projection.slice(0, 3).map((p, i) => (
                    <div key={i} className="rounded-xl bg-orbita-surface-alt px-3 py-3 text-center">
                      <p className="text-xs text-orbita-secondary">{p.month}</p>
                      <p className="mt-2 break-all text-sm font-semibold text-orbita-primary sm:break-normal">
                        ${p.projectedBalance.toLocaleString("es-CO", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-4 sm:p-8">
        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Lectura ejecutiva</p>
          <p className="text-sm text-orbita-secondary">
            {insight?.message ??
              "Resumen basado en los últimos 6 meses de transacciones del hogar (proyección lineal simple)."}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-orbita-secondary">
            <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-3 py-1">
              Estabilidad: {stability?.status ?? "—"}
            </span>
            <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-3 py-1">
              Score {score ?? "—"}
            </span>
            <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-3 py-1">
              Proyección 3m activa
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
