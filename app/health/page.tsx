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

/** Alineado con mock “biometric correlation” (área lavanda + línea verde). */
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
        Sleep debt / fatigue
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block shrink-0 rounded-full"
          style={{ width: 16, height: 3, background: BIOMETRIC_ENERGY_STROKE }}
        />
        Energy level
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
      { label: "HRV", value: String(salud.hrv), unit: "ms", accent: "var(--color-accent-warning)" },
      { label: "FC en reposo", value: String(salud.restingHR), unit: "bpm", accent: "var(--color-accent-danger)" },
      { label: "Score de sueño", value: String(salud.sleepScore), unit: "", accent: "var(--color-accent-health)" },
      { label: "Recuperación", value: String(recovery.score), unit: "%", accent: "var(--color-accent-warning)" },
      { label: "Batería corporal", value: String(salud.bodyBattery), unit: "%", accent: "var(--color-accent-warning)" },
    ],
    [salud.hrv, salud.restingHR, salud.sleepScore, salud.bodyBattery, recovery.score],
  )

  const hydrationTarget = salud.hydrationTarget
  const hydrationPct = Math.min(100, Math.round((salud.hydrationCurrent / Math.max(0.1, hydrationTarget)) * 100))

  const healthSummary = useHealthSummaryNarrative({
    loading: salud.loading,
    bodyBattery: salud.bodyBattery,
    sleepScore: salud.sleepScore,
    recoveryStatus: recovery.status,
    hrv: salud.hrv,
    restingHR: salud.restingHR,
    hydrationCurrent: salud.hydrationCurrent,
    hydrationTarget: salud.hydrationTarget,
    trainedToday,
    activeSupplements: activeCount,
    supplementsLoading: suppLoading,
    tendencia: salud.tendencia,
    macros: salud.macros.map((m) => ({ label: m.label, current: m.current, target: m.target })),
  })

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Operaciones de Salud</h1>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Biotelemetría, gestión de energía y optimización operativa
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
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            Modo mock: contexto de salud simulado; suplementos solo en localStorage.
          </p>
        )}
      </div>

      <Card>
        <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "10px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--color-text-secondary)",
            }}
          >
            Cómo te lee el día
          </p>
          {salud.loading ? (
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
              Preparando tu lectura…
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--color-text-primary)" }}>
              {healthSummary.paragraph}
            </p>
          )}
          {!salud.loading && (
            <p style={{ margin: 0, fontSize: "10px", lineHeight: 1.45, color: "var(--color-text-secondary)" }}>
              {healthSummary.usedAi
                ? "Texto redactado con inteligencia artificial a partir de lo mismo que ves en esta pantalla, en lenguaje cotidiano. No sustituye consejo médico."
                : "Resumen automático en palabras sencillas, a partir de lo que ya ves en tus tarjetas. No sustituye consejo médico."}
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {salud.loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <div style={{ padding: "var(--spacing-md)", minHeight: "72px" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>…</p>
                </div>
              </Card>
            ))
          : topMetrics.map((metric) => (
              <Card key={metric.label} hover>
                <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {metric.label}
                  </p>
                  <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: metric.accent }}>
                    {metric.value}
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}> {metric.unit}</span>
                  </p>
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
        takenToday={takenToday}
        toggleComplianceToday={toggleComplianceToday}
      />

      <Card>
        <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
          <p
            style={{
              margin: 0,
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--color-text-secondary)",
            }}
          >
            Biometric correlation: sleep vs daily energy
          </p>
          <p style={{ margin: 0, fontSize: "11px", lineHeight: 1.45, color: "var(--color-text-secondary)" }}>
            Siete muestras seguidas (últimos días de tu tendencia de energía y un proxy de sueño a partir de recuperación).
            Las etiquetas del eje inferior son solo referencia visual tipo jornada, no la hora real de cada registro.
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
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Hidratación
            </p>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "#3B82F6" }}>
              {salud.hydrationCurrent} / {hydrationTarget}L
            </p>
            <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
              <div style={{ height: "6px", borderRadius: "999px", width: `${hydrationPct}%`, background: "#3B82F6" }} />
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "10px" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Macronutrientes
            </p>
            {salud.macros.map((macro) => {
              const pct = Math.min(100, Math.round((macro.current / Math.max(1, macro.target)) * 100))
              return (
                <div key={macro.label} style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px" }}>{macro.label}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {macro.current} / {macro.target}
                      {macro.unit}
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "999px",
                        width: `${pct}%`,
                        background:
                          macro.label.toLowerCase().includes("prote")
                            ? "var(--color-accent-warning)"
                            : macro.label.toLowerCase().includes("carb")
                              ? "var(--color-accent-primary)"
                              : "var(--color-accent-health)",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
