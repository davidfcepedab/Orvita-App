"use client"

import { useId, useMemo, useState, type CSSProperties } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BatteryCharging,
  Droplets,
  Flame,
  HeartPulse,
  Minus,
  MoonStar,
  Sparkles,
  Target,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { ShortcutHealthAnalyticsSnapshot } from "@/lib/health/shortcutHealthAnalytics"
import { useHealthSupplements } from "@/app/hooks/useHealthSupplements"
import { SupplementStackSection } from "@/app/health/SupplementStackSection"
import { dedupeMetricsByLocalDay, vitalityScoreFromAppleRow } from "@/lib/health/appleTimelineDerived"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludMetricTone, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { HealthCorrelationsPanel } from "@/app/components/orbita-v3/salud/HealthCorrelationsPanel"

type ChartRow = { hour: string; vitality: number; recovery: number }

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  timeline: AutoHealthMetric[]
  analytics: ShortcutHealthAnalyticsSnapshot | null
  healthMetricsLoading: boolean
  /** Solo bio-stack + gráfico predictivo + correlaciones (sin bloque estratégico check-in). */
  layout?: "full" | "operativePredictiveOnly"
}

function mapFallbackEnergyAudit(health: SaludContextSnapshot): ChartRow[] {
  return health.energyAudit.map((row, i) => {
    const vitality = row.energy
    const wobble = (i % 3) - 1
    const recovery = Math.max(12, Math.min(96, Math.round(vitality * 0.86 + wobble * 9)))
    return { hour: row.hour, vitality, recovery }
  })
}

type SkinLike = {
  text: string
  textMuted: string
  surface: string
  border: string
  accent: { health: string; agenda: string }
}

function VitalityRecoveryTooltipContent({
  active,
  payload,
  label,
  theme,
  panelStyle,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string; value?: number }>
  label?: string
  theme: SkinLike
  panelStyle: CSSProperties
}) {
  if (!active || !payload?.length) return null
  const vitality = payload.find((p) => p.dataKey === "vitality")
  const recovery = payload.find((p) => p.dataKey === "recovery")
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-lg" style={panelStyle}>
      <p className="mb-1.5 font-semibold" style={{ color: theme.text }}>
        {label}
      </p>
      {vitality != null && typeof vitality.value === "number" ? (
        <p style={{ color: theme.textMuted }}>
          <span className="font-medium" style={{ color: SALUD_SEM.energy }}>
            Vitalidad
          </span>{" "}
          (sueño + movimiento): {vitality.value}
        </p>
      ) : null}
      {recovery != null && typeof recovery.value === "number" ? (
        <p className="mt-1" style={{ color: theme.textMuted }}>
          <span className="font-medium" style={{ color: SALUD_SEM.recovery }}>
            Recuperación
          </span>{" "}
          (modelo Apple): {recovery.value}
        </p>
      ) : null}
    </div>
  )
}

export default function HealthOperationsV3({
  salud: health,
  latest,
  timeline,
  analytics,
  healthMetricsLoading,
  layout = "full",
}: Props) {
  const theme = useOrbitaSkin()
  const compact = layout === "operativePredictiveOnly"
  const [showNutrition, setShowNutrition] = useState(true)
  const energyChartGradientId = useId().replace(/:/g, "")
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

  const activeSupplements = useMemo(() => supplements.filter((s) => s.active), [supplements])
  const supplementCompliancePct = useMemo(() => {
    if (activeSupplements.length === 0) return 0
    const done = activeSupplements.filter((s) => takenToday(s.id)).length
    return Math.round((done / activeSupplements.length) * 100)
  }, [activeSupplements, takenToday])

  const weeklyChartData: ChartRow[] = useMemo(() => {
    if (health.loading || health.error) return []
    const rows = dedupeMetricsByLocalDay(
      timeline.filter((row) => row.sleep_hours != null || row.steps != null || row.readiness_score != null),
    ).slice(-7)
    if (rows.length === 0) return mapFallbackEnergyAudit(health)
    return rows.map((row) => {
      const vitality = vitalityScoreFromAppleRow(row)
      const recoveryRaw = row.readiness_score
      const recovery =
        recoveryRaw != null
          ? Math.max(0, Math.min(100, Math.round(recoveryRaw)))
          : Math.max(0, Math.min(100, Math.round(vitality * 0.92)))
      return {
        hour: new Date(row.observed_at).toLocaleDateString("es-LA", { weekday: "short", day: "numeric" }),
        vitality,
        recovery,
      }
    })
  }, [timeline, health])

  if (health.loading) return null
  if (health.error) return null

  const appleReadiness = latest?.readiness_score ?? null
  const hydrationTarget = Math.max(health.hydrationTarget, 0.1)
  const hydrationProgress = Math.min(100, (health.hydrationCurrent / hydrationTarget) * 100)
  const dayMomentum = Math.round((hydrationProgress + supplementCompliancePct) / 2)

  const gridStroke = saludHexToRgba(theme.border, 0.85)
  const chartTooltip = {
    backgroundColor: saludHexToRgba(theme.surface, 0.96),
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    color: theme.text,
  }
  const latestWeekly = weeklyChartData[weeklyChartData.length - 1] ?? null
  const prevWeekly = weeklyChartData.length > 1 ? weeklyChartData[weeklyChartData.length - 2] : null
  const divergence = latestWeekly ? latestWeekly.vitality - latestWeekly.recovery : 0
  const deltaVitality = latestWeekly && prevWeekly ? latestWeekly.vitality - prevWeekly.vitality : 0
  const predictiveActions = latestWeekly
    ? [
        divergence <= -10
          ? "Vitalidad por debajo de recuperación: baja intensidad y prioriza movilidad + sueño."
          : divergence >= 12
            ? "Vitalidad por encima de recuperación: aprovecha energía, pero evita volumen extra."
            : "Vitalidad y recuperación en rango cercano: mantén plan base sin sobrecorrecciones.",
        deltaVitality <= -6
          ? "Tu vitalidad cayó vs ayer: sube hidratación y reduce una serie pesada."
          : deltaVitality >= 6
            ? "Tu vitalidad subió vs ayer: buen día para sesión de calidad controlada."
            : "Cambio estable vs ayer: enfócate en consistencia, no en intensidad.",
      ]
    : ["Sin suficientes lecturas Apple para sugerir ajustes diarios."]

  return (
    <section
      className={compact ? "mt-0 space-y-6" : "mt-10 space-y-10 lg:space-y-12"}
      style={{ color: theme.text }}
    >
      {!compact ? (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] border p-7 backdrop-blur-2xl sm:p-9"
        style={saludPanelStyle(theme, 0.88)}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
          Estratégico
        </p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <motion.div
              className="rounded-2xl p-3.5"
              style={{
                backgroundColor: saludHexToRgba(SALUD_SEM.ok, 0.12),
                color: SALUD_SEM.ok,
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeartPulse className="h-6 w-6" strokeWidth={1.65} />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Cuerpo, energía y hábitos</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                Tu check-in del día y la lectura de Apple en un solo lugar. Si no coinciden, priorizamos descanso y
                carga suave.
              </p>
            </div>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-8"
          style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
        >
          <div className="flex gap-3">
            <TriangleAlert
              className="mt-0.5 h-6 w-6 shrink-0"
              strokeWidth={1.65}
              style={{
                color:
                  appleReadiness != null && health.scoreSalud > 0 && Math.abs(appleReadiness - health.scoreSalud) >= 14
                    ? SALUD_SEM.warn
                    : theme.textMuted,
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Apple vs check-in
              </p>
              <p className="mt-1.5 text-sm leading-relaxed sm:text-[15px]" style={{ color: theme.text }}>
                {appleReadiness != null && health.scoreSalud > 0
                  ? appleReadiness > health.scoreSalud
                    ? `Apple te ve mejor de lo que te sientes (${appleReadiness} vs ${health.scoreSalud}).`
                    : `Te sientes mejor de lo que marca Apple (${health.scoreSalud} vs ${appleReadiness}).`
                  : "Aún no hay cruce completo entre Apple y check-in."}
              </p>
            </div>
          </div>
          <ul className="mt-5 list-none space-y-3 p-0 sm:space-y-4">
            <li className="flex items-start gap-3">
              <span
                className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: SALUD_SEM.energy }}
              >
                1
              </span>
              <Target className="mt-1 h-6 w-6 shrink-0" strokeWidth={1.65} style={{ color: SALUD_SEM.energy }} aria-hidden />
              <p className="m-0 min-w-0 flex-1 text-sm font-bold leading-snug sm:text-base">
                Ajusta carga del día antes de entrenar.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: SALUD_SEM.recovery }}
              >
                2
              </span>
              <Droplets className="mt-1 h-6 w-6 shrink-0" strokeWidth={1.65} style={{ color: SALUD_SEM.recovery }} aria-hidden />
              <p className="m-0 min-w-0 flex-1 text-sm font-bold leading-snug sm:text-base">
                Cierra sueño e hidratación con intención hoy.
              </p>
            </li>
          </ul>
        </div>

        <div className="mt-8 border-t pt-8" style={{ borderColor: theme.border }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
            Tu check-in (Órvita interna)
          </p>
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Salud emocional", value: health.scoreSalud, meta: "/100", icon: Sparkles, tint: SALUD_SEM.recovery },
              { label: "Energía física", value: health.scoreFisico, meta: "/100", icon: Activity, tint: SALUD_SEM.energy },
              {
                label: "Recuperación percibida",
                value: health.scoreRecuperacion,
                meta: "/100",
                icon: MoonStar,
                tint: SALUD_SEM.recovery,
              },
              {
                label: "Índice de energía",
                value: health.bodyBattery,
                meta: "/100",
                icon: BatteryCharging,
                tint: SALUD_SEM.energy,
              },
            ].map((metric, index) => {
              const Icon = metric.icon
              const status = metric.value >= 70 ? "OK" : metric.value >= 45 ? "Atención" : "Desbalance"
              const statusColor =
                metric.value >= 70 ? SALUD_SEM.ok : metric.value >= 45 ? SALUD_SEM.warn : SALUD_SEM.risk
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="min-w-0 rounded-2xl p-5"
                  style={{
                    backgroundColor: saludHexToRgba(metric.tint, 0.1),
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <motion.div
                        style={{ color: theme.textMuted }}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
                        aria-hidden
                      >
                        <Icon className="h-7 w-7 shrink-0" strokeWidth={1.65} />
                      </motion.div>
                      <span
                        className="min-w-0 text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] sm:text-[11px]"
                        style={{ color: theme.textMuted }}
                      >
                        {metric.label}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold sm:text-[11px]"
                      style={{
                        backgroundColor: saludHexToRgba(statusColor, 0.18),
                        color: statusColor,
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <p
                    className="mt-4 text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
                    style={{ color: theme.text }}
                  >
                    {metric.value}
                    <span className="ml-1.5 text-sm font-semibold sm:text-base" style={{ color: theme.textMuted }}>
                      {metric.meta}
                    </span>
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: compact ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={compact ? "rounded-2xl border p-5 sm:p-6" : "rounded-[28px] border p-6 backdrop-blur-2xl sm:p-8"}
        style={saludPanelStyle(theme, 0.9)}
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
            Operativo
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">Bio-stack y combustible</h3>
          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
            Suplementos, agua y macros. El impulso resume cumplimiento del stack + hidratación.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div
            className="min-w-0 overflow-hidden rounded-2xl"
            style={{ backgroundColor: saludHexToRgba(SALUD_SEM.ok, 0.06) }}
          >
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
          </div>
          <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
            <div
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 sm:px-5"
              style={{
                backgroundColor: saludHexToRgba(SALUD_SEM.energy, 0.1),
              }}
            >
              {compact ? (
                <Flame className="h-7 w-7 shrink-0" style={{ color: SALUD_SEM.energy }} aria-hidden />
              ) : (
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Flame className="h-7 w-7 shrink-0" style={{ color: SALUD_SEM.energy }} aria-hidden />
                </motion.div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                  Impulso del día
                </p>
                <p className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: theme.text }}>
                  {dayMomentum}
                  <span className="text-base font-semibold">%</span>
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-5">
            <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Combustible
              </p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ backgroundColor: saludHexToRgba(theme.border, 0.2), color: theme.textMuted }}
                onClick={() => setShowNutrition((v) => !v)}
              >
                {showNutrition ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <div
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: saludHexToRgba(SALUD_SEM.neutral, 0.08),
              }}
            >
              {compact ? (
                <div className="mt-0.5 shrink-0" style={{ color: SALUD_SEM.neutral }}>
                  <Droplets className="h-6 w-6" aria-hidden />
                </div>
              ) : (
              <motion.div
                style={{ color: SALUD_SEM.neutral }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="mt-0.5 shrink-0"
              >
                <Droplets className="h-6 w-6" aria-hidden />
              </motion.div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Hidratación</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {health.hydrationCurrent}
                  <span className="ml-2 text-sm font-medium" style={{ color: theme.textMuted }}>
                    / {health.hydrationTarget} L
                  </span>
                </p>
                <p className="mt-2 text-[11px] leading-snug" style={{ color: theme.textMuted }}>
                  {health.hydrationFromHabit
                    ? "La barra sigue tu hábito de agua en Inicio (registros de hoy)."
                    : health.hydrationTracked
                      ? "La barra usa lo que guardaste en preferencias de salud para hoy."
                      : "Registra vasos en Inicio o actualiza preferencias para ver progreso real."}
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: `${hydrationProgress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    style={{
                      background: `linear-gradient(90deg, ${SALUD_SEM.neutral}, ${saludHexToRgba(SALUD_SEM.ok, 0.85)})`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className={`${showNutrition ? "mt-5 space-y-4" : "hidden"}`}>
              <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                {health.macrosFromLog
                  ? "Macros desde lo que guardaste hoy en preferencias de salud (gramos de P / C / G)."
                  : "Sin registro de macros hoy en preferencias: las barras quedan en 0 hasta que los actualices."}
              </p>
              {health.macros.map((macro) => {
                const progress = Math.min(100, (macro.current / macro.target) * 100)

                return (
                  <div key={macro.label}>
                    <div className="mb-1 flex items-center justify-between text-xs" style={{ color: theme.textMuted }}>
                      <span>{macro.label}</span>
                      <span className="font-medium" style={{ color: theme.text }}>
                        {macro.current} / {macro.target}
                        {macro.unit}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 140, damping: 20 }}
                        style={{ backgroundColor: saludMetricTone(theme, progress) }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div
        className={compact ? "rounded-2xl border p-5 sm:p-6" : "rounded-[26px] border p-6 backdrop-blur-2xl sm:p-7"}
        style={saludPanelStyle(theme, 0.82)}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
          Predictivo e interpretación
        </p>
        <h3 className="mt-2 text-xl font-semibold">Vitalidad vs recuperación (semana)</h3>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: theme.textMuted }}>
          <strong className="font-semibold" style={{ color: theme.text }}>
            Vitalidad
          </strong>{" "}
          mezcla sueño + pasos;{" "}
          <strong className="font-semibold" style={{ color: theme.text }}>
            recuperación
          </strong>{" "}
          es el modelo Apple (HRV, sueño, movimiento). En importaciones recientes ambas pueden parecerse, pero ya no
          comparten el mismo campo duplicado.
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px]" style={{ color: theme.textMuted }}>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SALUD_SEM.energy }} aria-hidden />
            Vitalidad (línea)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-sm" style={{ backgroundColor: saludHexToRgba(SALUD_SEM.recovery, 0.45) }} aria-hidden />
            Recuperación (área)
          </span>
        </div>
        <div className="mt-6 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyChartData}>
              {!compact ? (
              <defs>
                <linearGradient id={energyChartGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SALUD_SEM.recovery} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={SALUD_SEM.recovery} stopOpacity={0} />
                </linearGradient>
              </defs>
              ) : null}
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="hour" stroke={theme.textMuted} style={{ fontSize: "11px" }} />
              <YAxis yAxisId="left" domain={[0, 100]} hide />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke={theme.textMuted} style={{ fontSize: "11px" }} />
              <Tooltip
                content={(tipProps) => (
                  <VitalityRecoveryTooltipContent
                    active={tipProps.active}
                    payload={tipProps.payload as ReadonlyArray<{ dataKey?: string; value?: number }> | undefined}
                    label={tipProps.label as string | undefined}
                    theme={theme}
                    panelStyle={chartTooltip}
                  />
                )}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="recovery"
                fill={compact ? saludHexToRgba(SALUD_SEM.recovery, 0.2) : `url(#${energyChartGradientId})`}
                stroke={SALUD_SEM.recovery}
                strokeWidth={1.2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vitality"
                stroke={SALUD_SEM.energy}
                strokeWidth={2.5}
                dot={{ r: 3, fill: theme.surface, stroke: SALUD_SEM.energy, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div
          className="mt-6 space-y-4 border-t pt-6"
          style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
        >
          {predictiveActions.map((action, idx) => {
            const Icon =
              idx === 0
                ? divergence <= -10
                  ? TriangleAlert
                  : divergence >= 12
                    ? Flame
                    : Activity
                : deltaVitality <= -6
                  ? TrendingDown
                  : deltaVitality >= 6
                    ? TrendingUp
                    : Minus
            const iconColor =
              idx === 0
                ? divergence <= -10
                  ? SALUD_SEM.warn
                  : divergence >= 12
                    ? SALUD_SEM.energy
                    : SALUD_SEM.ok
                : deltaVitality <= -6
                  ? SALUD_SEM.warn
                  : deltaVitality >= 6
                    ? SALUD_SEM.ok
                    : theme.textMuted
            return (
              <div key={`pred-${idx}-${action.slice(0, 24)}`} className="flex gap-3">
                <Icon className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.65} style={{ color: iconColor }} aria-hidden />
                <p className="m-0 min-w-0 text-[15px] font-semibold leading-snug sm:text-base">{action}</p>
              </div>
            )
          })}
        </div>

        <HealthCorrelationsPanel
          salud={health}
          latest={latest}
          timeline={timeline}
          analytics={analytics}
          loading={healthMetricsLoading}
          variant="embedded"
        />
      </div>
    </section>
  )
}
