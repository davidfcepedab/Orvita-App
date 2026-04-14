"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { FinanceViewHeader } from "../_components/FinanceViewHeader"
import { financeViewRootClass } from "../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { FINANCE_INSIGHTS_STRAPLINE } from "@/lib/finanzas/financeModuleCopy"
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

interface InsightsMeta {
  months: number
  throughMonth: string
}

function formatYmLongEs(ym: string) {
  const [ys, ms] = ym.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  return new Date(y, m - 1, 15).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

function formatMoneyCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))
}

export default function FinanzasInsights() {
  const finance = useFinance()

  const [data, setData] = useState<InsightsResponse | null>(null)
  const [meta, setMeta] = useState<InsightsMeta | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const month = finance?.month ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0

  useEffect(() => {
    if (!month) {
      setData(null)
      setMeta(null)
      setSource(null)
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
          meta?: InsightsMeta
          source?: string
        }

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setNotice(json.notice ?? null)
        setMeta(json.meta ?? null)
        setSource(json.source ?? null)
        setData((json.data as InsightsResponse) ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        setData(null)
        setMeta(null)
        setSource(null)
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
    <div className={financeViewRootClass}>
      <FinanceViewHeader
        kicker="Perspectivas"
        title="Lectura de tu flujo"
        subtitle={FINANCE_INSIGHTS_STRAPLINE}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {source === "mock" ? (
              <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
                Demo
              </span>
            ) : null}
            {notice ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-900">
                {notice}
              </span>
            ) : null}
          </div>
        }
      />

      <Card className="border border-orbita-border/80 bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,var(--color-surface))] p-3 sm:p-4">
        <p className="m-0 text-sm leading-relaxed text-orbita-primary">
          Ventana de{" "}
          <span className="tabular-nums font-semibold">{meta?.months ?? 6}</span> meses hasta{" "}
          <span className="font-semibold">{formatYmLongEs(meta?.throughMonth ?? month)}</span>. Score y estabilidad
          recompensan ahorro vs ingresos y baja volatilidad del flujo neto.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid gap-3 sm:gap-4">
          {score !== undefined && (
            <Card hover className="p-3 sm:p-5">
              <div className="grid gap-2 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
                  Salud financiera (índice)
                </p>
                <p
                  className={`text-4xl font-semibold tabular-nums sm:text-5xl ${
                    score >= 70
                      ? "text-emerald-600"
                      : score >= 40
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {Math.round(score)}
                </p>
                <p className="text-xs text-orbita-secondary">Escala 0–100 · mezcla ahorro/volatilidad</p>
              </div>
            </Card>
          )}

          <Card hover className="p-3 sm:p-5">
            <div className="grid gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Estabilidad del flujo</p>
                <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                  Un solo número resume qué tan predecible es tu caja en el historial analizado.
                </p>
              </div>
              {stability ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p
                      className={`text-3xl font-semibold tabular-nums ${
                        stability.status === "green"
                          ? "text-emerald-600"
                          : stability.status === "yellow"
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {Math.round(stability.stabilityIndex)}
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
                  <div className="grid gap-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2 border-b border-orbita-border/50 pb-2">
                      <span className="text-orbita-secondary">Operativo (cobertura de gastos)</span>
                      <span className="shrink-0 tabular-nums font-semibold text-orbita-primary">
                        {Math.round(stability.scoreOperativo)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 border-b border-orbita-border/50 pb-2">
                      <span className="text-orbita-secondary">Liquidez (flujo vs ingresos)</span>
                      <span className="shrink-0 tabular-nums font-semibold text-orbita-primary">
                        {Math.round(stability.scoreLiquidez)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-orbita-secondary">Riesgo (inverso a estabilidad)</span>
                      <span className="shrink-0 tabular-nums font-semibold text-orbita-primary">
                        {Math.round(stability.scoreRiesgo)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-orbita-secondary">Sin datos</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {insight && (
            <Card hover className="p-3 sm:p-5">
              <div className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Qué destacaría el sistema</p>
                <p className="break-words text-sm font-medium leading-relaxed text-orbita-primary">{insight.message}</p>
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
            <Card hover className="p-3 sm:p-5">
              <div className="grid gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Proyección simple (3 meses)</p>
                  <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                    Suma el flujo neto medio mes a mes; es una referencia, no un saldo bancario.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {prediction.projection.slice(0, 3).map((p, i) => (
                    <div key={i} className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/80 px-3 py-3 text-center">
                      <p className="text-xs font-medium text-orbita-secondary">{p.month}</p>
                      <p className="mt-2 text-sm font-semibold tabular-nums text-orbita-primary">
                        ${formatMoneyCOP(p.projectedBalance)} COP
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-3 sm:p-5">
        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Resumen en una línea</p>
          <p className="text-sm leading-relaxed text-orbita-primary">
            {insight?.message ??
              "Sin mensaje automático: revisa que haya movimientos en el periodo y que Supabase esté activo."}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-orbita-secondary">
            <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-3 py-1">
              Estado: {stability?.status === "green" ? "favorable" : stability?.status === "yellow" ? "atención" : stability?.status === "red" ? "crítico" : "—"}
            </span>
            <span className="rounded-full border border-orbita-border bg-orbita-surface-alt px-3 py-1">
              Índice {score != null ? Math.round(score) : "—"}/100
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
