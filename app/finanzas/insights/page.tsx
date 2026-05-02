"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { FinanceViewHeader } from "../_components/FinanceViewHeader"
import {
  financeCardHintClass,
  financeCardMicroLabelClass,
  financeHeroChipBaseClass,
  financeKpiCardClass,
  financeModuleContentStackClass,
  financeModulePageBodyClass,
  financeNeutralChipClass,
  financeNoticeChipClass,
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
} from "../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { FINANCE_INSIGHTS_STRAPLINE } from "@/lib/finanzas/financeModuleCopy"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { formatYmLongMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { cn } from "@/lib/utils"

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
  /** Misma base que GET meta / Resumen: gasto operativo del catálogo. */
  basis?: string
  catalogEntries?: number
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
      <div
        className={cn(
          financePlStackClass,
          financeModulePageBodyClass,
          financeModuleContentStackClass,
          "py-8 text-center text-orbita-secondary sm:py-10",
        )}
      >
        <p>Cargando perspectivas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(financePlStackClass, financeModulePageBodyClass, financeModuleContentStackClass)}>
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
      </div>
    )
  }

  if (!data) {
    return (
      <div
        className={cn(
          financePlStackClass,
          financeModulePageBodyClass,
          financeModuleContentStackClass,
          "py-8 text-center text-orbita-secondary sm:py-10",
        )}
      >
        <p>Sin datos de análisis para este periodo.</p>
        {notice ? <p className="mt-2 text-xs text-orbita-secondary">{notice}</p> : null}
      </div>
    )
  }

  const { score, insight, stability, prediction } = data

  const stabilityTone = {
    green: {
      text: "text-[var(--color-accent-health)]",
      badge:
        "border-[color-mix(in_srgb,var(--color-accent-health)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-emerald-950 dark:text-emerald-100",
    },
    yellow: {
      text: "text-[var(--color-accent-warning)]",
      badge:
        "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-50",
    },
    red: {
      text: "text-[var(--color-accent-danger)]",
      badge:
        "border-[color-mix(in_srgb,var(--color-accent-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,var(--color-surface))] text-[var(--color-accent-danger)]",
    },
  } as const

  const scoreTone =
    score !== undefined
      ? score >= 70
        ? stabilityTone.green.text
        : score >= 40
          ? stabilityTone.yellow.text
          : stabilityTone.red.text
      : ""

  return (
    <div className={cn(financePlStackClass, financeModulePageBodyClass, financeModuleContentStackClass)}>
      <FinanceViewHeader
        kicker="Perspectivas"
        title="Lectura de tu flujo"
        subtitle={FINANCE_INSIGHTS_STRAPLINE}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {source === "mock" ? (
              <span className={financeNeutralChipClass}>Demo</span>
            ) : null}
            {notice ? <span className={financeNoticeChipClass}>{notice}</span> : null}
          </div>
        }
      />

      <section className="space-y-2" aria-label="Contexto del análisis">
        <h2 className={financeSectionEyebrowClass}>Contexto del análisis</h2>
        <Card className={cn(financeKpiCardClass, "border-[color-mix(in_srgb,var(--color-accent-finance)_22%,var(--color-border))] p-3 sm:p-4")}>
          <p className={cn(financeSectionIntroClass, "mt-0 text-orbita-primary sm:text-[13px]")}>
            Ventana de{" "}
            <span className="tabular-nums font-semibold text-orbita-primary">{meta?.months ?? 6}</span> meses hasta{" "}
            <span className="font-semibold">{formatYmLongMonthYearEsCo(meta?.throughMonth ?? month)}</span>
            {meta?.basis === "operativo" ? (
              <>
                . Índices sobre <span className="font-semibold">flujo operativo</span> (misma base que Datos en el hero y
                Resumen / P&amp;L).
              </>
            ) : (
              <>.</>
            )}{" "}
            Score y estabilidad combinan ahorro frente a ingresos y la volatilidad mes a mes.
          </p>
        </Card>
      </section>

      <section aria-labelledby="insights-kpi-heading" className="space-y-3">
        <h2 id="insights-kpi-heading" className={financeSectionEyebrowClass}>
          Índices y estabilidad
        </h2>
        <p className={financeSectionIntroClass}>Números grandes para lectura rápida; el detalle técnico queda en tarjetas inferiores.</p>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="grid gap-4 sm:gap-5">
            {score !== undefined && (
              <Card hover className={cn(financeKpiCardClass, "p-4 sm:p-5")}>
                <div className="grid gap-2 text-center sm:text-left">
                  <p className={financeCardMicroLabelClass}>Salud financiera (índice)</p>
                  <p className={cn("text-4xl font-bold tabular-nums sm:text-5xl", scoreTone)}>{Math.round(score)}</p>
                  <div className="mx-auto mt-1 h-1.5 w-full max-w-[14rem] rounded-full bg-orbita-surface-alt/90 ring-1 ring-orbita-border/40 sm:mx-0">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-finance),var(--color-accent-health))] transition-all"
                      style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                    />
                  </div>
                  <p className={financeCardHintClass}>Escala 0–100 · ahorro y volatilidad del flujo operativo</p>
                </div>
              </Card>
            )}

            <Card hover className={cn(financeKpiCardClass, "p-4 sm:p-5")}>
              <div className="grid gap-3">
                <div>
                  <p className={financeCardMicroLabelClass}>Estabilidad del flujo</p>
                  <p className={financeCardHintClass}>
                    Resume qué tan predecible es tu caja en la ventana analizada (modelo interno).
                  </p>
                </div>
                {stability ? (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <p
                        className={cn(
                          "text-3xl font-bold tabular-nums",
                          stability.status === "green"
                            ? stabilityTone.green.text
                            : stability.status === "yellow"
                              ? stabilityTone.yellow.text
                              : stabilityTone.red.text,
                        )}
                      >
                        {Math.round(stability.stabilityIndex)}
                      </p>
                      <span
                        className={cn(
                          financeHeroChipBaseClass,
                          "px-3 py-1 text-[10px] uppercase tracking-[0.14em]",
                          stability.status === "green"
                            ? stabilityTone.green.badge
                            : stability.status === "yellow"
                              ? stabilityTone.yellow.badge
                              : stabilityTone.red.badge,
                        )}
                      >
                        {stability.status === "green"
                          ? "Estable"
                          : stability.status === "yellow"
                            ? "Presión"
                            : "Riesgo"}
                      </span>
                    </div>
                    <div className="grid gap-2.5 text-[11px] sm:text-xs">
                      <div className="flex items-start justify-between gap-2 border-b border-orbita-border/45 pb-2">
                        <span className="text-orbita-muted">Operativo (cobertura)</span>
                        <span className="shrink-0 tabular-nums font-semibold text-orbita-primary">
                          {Math.round(stability.scoreOperativo)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 border-b border-orbita-border/45 pb-2">
                        <span className="text-orbita-muted">Liquidez (flujo vs ingresos)</span>
                        <span className="shrink-0 tabular-nums font-semibold text-orbita-primary">
                          {Math.round(stability.scoreLiquidez)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-orbita-muted">Riesgo (inverso a estabilidad)</span>
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

          <div className="grid gap-4 sm:gap-5">
            {insight ? (
              <Card hover className={cn(financeKpiCardClass, "p-4 sm:p-5")}>
                <div className="grid gap-3">
                  <p className={financeCardMicroLabelClass}>Señal del sistema</p>
                  <p className="text-pretty text-sm font-semibold leading-relaxed text-orbita-primary [overflow-wrap:anywhere]">
                    {insight.message}
                  </p>
                  {insight.all && insight.all.length > 1 ? (
                    <ul className="mt-1 space-y-1.5 text-[11px] leading-relaxed text-orbita-muted sm:text-xs">
                      {insight.all.slice(1).map((msg, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--color-accent-finance)]" aria-hidden>
                            ·
                          </span>
                          <span>{msg}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <span
                    className={cn(
                      financeHeroChipBaseClass,
                      "mt-1 w-fit px-3 py-1 text-[10px] uppercase tracking-[0.14em]",
                      insight.type === "alert"
                        ? stabilityTone.red.badge
                        : "border-[color-mix(in_srgb,var(--color-accent-finance)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] text-[var(--color-accent-finance)]",
                    )}
                  >
                    {insight.type === "alert" ? "Riesgo activo" : "Señal positiva"}
                  </span>
                </div>
              </Card>
            ) : null}

            {prediction?.projection ? (
              <Card hover className={cn(financeKpiCardClass, "p-4 sm:p-5")}>
                <div className="grid gap-3">
                  <div>
                    <p className={financeCardMicroLabelClass}>Proyección simple (3 meses)</p>
                    <p className={financeCardHintClass}>
                      Tendencia a partir del flujo operativo medio; no es saldo bancario ni cierre contable.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    {prediction.projection.slice(0, 3).map((p, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-orbita-border/55 bg-orbita-surface/80 px-3 py-3 text-center shadow-sm"
                      >
                        <p className="text-[11px] font-medium text-orbita-muted">{p.month}</p>
                        <p className="mt-2 text-sm font-bold tabular-nums text-orbita-primary">
                          ${formatMoneyCOP(p.projectedBalance)}{" "}
                          <span className="text-[10px] font-semibold text-orbita-muted">COP</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="insights-recap-heading" className="space-y-2">
        <h2 id="insights-recap-heading" className={financeSectionEyebrowClass}>
          Próxima lectura
        </h2>
        <Card className={cn(financeKpiCardClass, "border-l-[3px] border-l-[color-mix(in_srgb,var(--color-accent-finance)_55%,var(--color-border))] p-4 sm:p-5")}>
          <p className="text-pretty text-sm font-medium leading-relaxed text-orbita-primary [overflow-wrap:anywhere]">
            {insight?.message ??
              "Sin mensaje automático: revisa movimientos en el periodo y que la sincronización esté activa."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={financeNeutralChipClass}>
              Estado:{" "}
              {stability?.status === "green"
                ? "Favorable"
                : stability?.status === "yellow"
                  ? "Atención"
                  : stability?.status === "red"
                    ? "Crítico"
                    : "—"}
            </span>
            <span className={financeNeutralChipClass}>Índice {score != null ? Math.round(score) : "—"}/100</span>
          </div>
        </Card>
      </section>
    </div>
  )
}
