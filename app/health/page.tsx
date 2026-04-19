"use client"

import { useId, useMemo } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/src/components/ui/Card"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthSupplements } from "@/app/hooks/useHealthSupplements"
import { SupplementStackSection } from "@/app/health/SupplementStackSection"
import { calculateRecovery } from "@/src/modules/health/recoveryEngine"
import { buildRecoveryInputs } from "@/lib/health/recoveryFromContext"
import {
  buildBiometricCorrelationChartSeries,
  type BiometricCorrelationChartPoint,
} from "@/lib/health/sleepEnergyCorrelation"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isAppMockMode, isSupabaseEnabled, UI_HEALTH_SUPPLEMENTS_LOCAL } from "@/lib/checkins/flags"
import { useHealthSummaryNarrative } from "@/app/health/useHealthSummaryNarrative"

/** Área “fatiga” (proxy de sueño a partir de check-ins, no polisomnografía). */
const BIOMETRIC_AREA_TOP = "#E8EAF6"
const BIOMETRIC_AREA_BOTTOM = "#E8EAF6"
const BIOMETRIC_ENERGY_STROKE = "#22B455"

const biometricChartMargin = { top: 14, right: 42, left: 4, bottom: 28 } as const

function BiometricCorrelationLegend() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
      style={{
        marginTop: 4,
        paddingTop: 8,
        fontSize: 11,
        color: "var(--color-text-secondary)",
      }}
    >
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block shrink-0 rounded-[3px]"
          style={{ width: 12, height: 12, background: BIOMETRIC_AREA_TOP }}
        />
        Deuda de sueño / fatiga
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block shrink-0 rounded-full"
          style={{ width: 16, height: 3, background: BIOMETRIC_ENERGY_STROKE }}
        />
        Nivel de energía (proxy)
      </span>
    </div>
  )
}

export default function HealthPage() {
  const salud = useSaludContext()
  const { today } = useTraining()
  const {
    supplements,
    activeCount,
    editMode,
    setEditMode,
    updateSupplement,
    addSupplement,
    removeSupplement,
    takenToday,
    toggleComplianceToday,
    loading: suppLoading,
    error: suppError,
  } = useHealthSupplements()

  const trainedToday = today?.status === "trained"
  const recoveryInput = useMemo(
    () => buildRecoveryInputs(salud.scoreRecuperacion, trainedToday),
    [salud.scoreRecuperacion, trainedToday],
  )
  const recovery = useMemo(() => calculateRecovery(recoveryInput), [recoveryInput])

  const correlationChartId = useId().replace(/:/g, "")
  const correlationData = useMemo(
    () => buildBiometricCorrelationChartSeries(salud.tendencia, salud.scoreRecuperacion),
    [salud.tendencia, salud.scoreRecuperacion],
  )

  const remotePrefs = isSupabaseEnabled() && !isAppMockMode()

  const topMetrics = useMemo(
    () => [
      {
        label: "Pulso global",
        value: salud.scoreGlobal > 0 ? String(Math.round(salud.scoreGlobal)) : "—",
        unit: "/100",
        hint: "Media del último check-in",
        accent: "var(--color-accent-primary)",
      },
      {
        label: "Salud",
        value: String(Math.round(salud.scoreSalud)),
        unit: "/100",
        hint: "Dimensión salud del check-in",
        accent: "var(--color-accent-health)",
      },
      {
        label: "Cuerpo",
        value: String(Math.round(salud.scoreFisico)),
        unit: "/100",
        hint: "Dimensión física del check-in",
        accent: "var(--color-accent-danger)",
      },
      {
        label: "Profesional",
        value: String(Math.round(salud.scoreProfesional)),
        unit: "/100",
        hint: "Dimensión trabajo del check-in",
        accent: "var(--color-accent-warning)",
      },
      {
        label: salud.tendencia.length > 0 ? "Media salud 7d" : "Tendencia 7d",
        value: salud.tendencia.length > 0 ? String(Math.round(salud.trendAverage)) : "—",
        unit: salud.tendencia.length > 0 ? "/100" : "",
        hint: "Promedio score salud en check-ins recientes",
        accent: "var(--color-accent-health)",
      },
      {
        label: "Recuperación (app)",
        value: String(recovery.score),
        unit: "%",
        hint: "Modelo interno + entreno hoy",
        accent: "var(--color-accent-warning)",
      },
    ],
    [
      salud.scoreGlobal,
      salud.scoreSalud,
      salud.scoreFisico,
      salud.scoreProfesional,
      salud.tendencia.length,
      salud.trendAverage,
      recovery.score,
    ],
  )

  const hydrationTarget = salud.hydrationTarget
  const hydrationPct = salud.hydrationTracked
    ? Math.min(100, Math.round((salud.hydrationCurrent / Math.max(0.1, hydrationTarget)) * 100))
    : 0

  const healthSummary = useHealthSummaryNarrative({
    loading: salud.loading,
    bodyBattery: salud.bodyBattery,
    sleepScore: salud.sleepScore,
    recoveryStatus: recovery.status,
    pulseSalud: salud.scoreSalud,
    pulseFisico: salud.scoreFisico,
    hydrationCurrent: salud.hydrationCurrent,
    hydrationTarget: salud.hydrationTarget,
    hydrationTracked: salud.hydrationTracked,
    trainedToday,
    activeSupplements: activeCount,
    supplementsLoading: suppLoading,
    tendencia: salud.tendencia,
    macros: salud.macros.map((m) => ({ label: m.label, current: m.current, target: m.target })),
    macrosFromLog: salud.macrosFromLog,
  })

  return (
    <div className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))]">
      <div className="min-w-0 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface))] px-4 py-4 shadow-[0_12px_40px_-16px_color-mix(in_srgb,var(--color-accent-health)_18%,transparent)] sm:px-6 sm:py-5">
        <h1 className="m-0 text-2xl font-medium tracking-tight text-[var(--color-text-primary)] phone:text-[1.75rem]">
          Operaciones de Salud
        </h1>
        <p className="m-0 mt-1.5 max-w-[40rem] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Check-ins reales (Supabase), tendencia de 7 días y preferencias opcionales de hidratación/macros. Lo que no
          registres aquí no se inventa: sin wearable integrado no mostramos HRV ni FC medidas.
        </p>
        {salud.error && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-accent-danger)" }}>{salud.error}</p>
        )}
        {!remotePrefs && !isAppMockMode() && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            {UI_HEALTH_SUPPLEMENTS_LOCAL}
          </p>
        )}
        {isAppMockMode() && (
          <p className="m-0 mt-2 text-[11px] text-[var(--color-text-secondary)]">
            Modo mock: check-ins de ejemplo; suplementos siguen en localStorage si no hay Supabase.
          </p>
        )}
      </div>

      <Card>
        <div className="grid gap-3 p-4 sm:gap-3.5 sm:p-6">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Cómo te lee el día
          </p>
          {salud.loading ? (
            <p className="m-0 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">Preparando tu lectura…</p>
          ) : (
            <p className="m-0 max-w-prose text-pretty text-[14px] leading-relaxed tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[15px] sm:leading-[1.55]">
              {healthSummary.paragraph}
            </p>
          )}
          {!salud.loading && (
            <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              {healthSummary.usedAi
                ? "Texto redactado con inteligencia artificial a partir de lo mismo que ves en esta pantalla, en lenguaje cotidiano. No sustituye consejo médico."
                : "Resumen automático en palabras sencillas, a partir de lo que ya ves en tus tarjetas. No sustituye consejo médico."}
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] sm:grid-cols-2 lg:grid-cols-3">
        {salud.loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <div className="min-h-[88px] p-4">
                  <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">…</p>
                </div>
              </Card>
            ))
          : topMetrics.map((metric) => (
              <Card key={metric.label} hover>
                <div className="grid gap-1.5 p-4 sm:p-5">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                    {metric.label}
                  </p>
                  <p className="m-0 text-[22px] font-semibold tabular-nums leading-tight tracking-tight" style={{ color: metric.accent }}>
                    {metric.value}
                    <span className="text-[12px] font-medium text-[var(--color-text-secondary)]"> {metric.unit}</span>
                  </p>
                  <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">{metric.hint}</p>
                </div>
              </Card>
            ))}
      </div>

      <SupplementStackSection
        supplements={supplements}
        activeCount={activeCount}
        suppLoading={suppLoading}
        suppError={suppError}
        editMode={editMode}
        setEditMode={setEditMode}
        updateSupplement={updateSupplement}
        addSupplement={addSupplement}
        removeSupplement={removeSupplement}
        takenToday={takenToday}
        toggleComplianceToday={toggleComplianceToday}
      />

      <Card>
        <div className="grid gap-2 p-4 sm:gap-3 sm:p-6">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Correlación proxy: sueño vs energía
          </p>
          <p className="m-0 max-w-prose text-[11px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[12px]">
            Siete puntos alineados con tus últimos check-ins (score salud como energía y un proxy de “carga de sueño”
            derivado del mismo dato). El eje inferior es solo referencia visual tipo jornada, no hora real de medición.
          </p>
          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
            <div className="h-[260px] min-h-[220px] w-full min-w-[280px] sm:h-[280px]">
              {salud.loading ? (
                <div
                  style={{
                    height: "100%",
                    borderRadius: "12px",
                    background: "var(--color-surface-alt)",
                    border: "0.5px solid var(--color-border)",
                  }}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={correlationData} margin={biometricChartMargin}>
                    <defs>
                      <linearGradient id={`${correlationChartId}-fatigue`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BIOMETRIC_AREA_TOP} stopOpacity={0.92} />
                        <stop offset="100%" stopColor={BIOMETRIC_AREA_BOTTOM} stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" strokeOpacity={0.65} vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                      interval={0}
                    />
                    <YAxis yAxisId="scale" orientation="right" width={36} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={rechartsTooltipContentStyle}
                      formatter={(value, name) => {
                        const n = String(name)
                        if (n === "fatigue") return [value, "Sleep debt / fatigue"]
                        if (n === "energy") return [value, "Energy level"]
                        return [value, n]
                      }}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as BiometricCorrelationChartPoint | undefined
                        if (!row) return ""
                        return `${row.dayAbbrev} · ${row.sequenceHint}`
                      }}
                    />
                    <Legend content={() => <BiometricCorrelationLegend />} verticalAlign="bottom" />
                    <Area
                      yAxisId="scale"
                      type="natural"
                      dataKey="fatigue"
                      name="fatigue"
                      stroke="none"
                      fill={`url(#${correlationChartId}-fatigue)`}
                      fillOpacity={1}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="scale"
                      type="natural"
                      dataKey="energy"
                      name="energy"
                      stroke={BIOMETRIC_ENERGY_STROKE}
                      strokeWidth={2.25}
                      dot={{ r: 4, fill: "#ffffff", stroke: BIOMETRIC_ENERGY_STROKE, strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "#ffffff", stroke: BIOMETRIC_ENERGY_STROKE, strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] sm:grid-cols-2">
        <Card>
          <div className="grid gap-2 p-4 sm:p-5">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Hidratación
            </p>
            {!salud.hydrationTracked ? (
              <p className="m-0 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Sin registro de agua hoy: no mostramos litros inventados. Cuando guardes tu consumo en preferencias de
                salud (mismo endpoint que suplementos), aparecerá aquí con la barra de progreso.
              </p>
            ) : (
              <>
                <p className="m-0 text-[22px] font-semibold tabular-nums text-[#3B82F6]">
                  {salud.hydrationCurrent} / {hydrationTarget}L
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${hydrationPct}%` }} />
                </div>
              </>
            )}
          </div>
        </Card>
        <Card>
          <div className="grid gap-3 p-4 sm:p-5">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Macronutrientes
            </p>
            {!salud.macrosFromLog ? (
              <p className="m-0 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Sin gramos de macros registrados hoy. Los objetivos son referencia; los consumos reales vendrán de lo
                que guardes en preferencias de salud (no se estiman a partir del check-in).
              </p>
            ) : (
              salud.macros.map((macro) => {
                const pct = Math.min(100, Math.round((macro.current / Math.max(1, macro.target)) * 100))
                return (
                  <div key={macro.label} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-[var(--color-text-primary)]">{macro.label}</span>
                      <span className="text-[11px] tabular-nums text-[var(--color-text-secondary)]">
                        {macro.current} / {macro.target}
                        {macro.unit}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: macro.label.toLowerCase().includes("prote")
                            ? "var(--color-accent-warning)"
                            : macro.label.toLowerCase().includes("carb")
                              ? "var(--color-accent-primary)"
                              : "var(--color-accent-health)",
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
