"use client"

import { useId, useMemo, useState, type CSSProperties } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BatteryCharging,
  Droplets,
  Flame,
  HeartPulse,
  MoonStar,
  Sparkles,
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
import { saludHexToRgba, saludMetricTone, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { HealthCorrelationsPanel } from "@/app/components/orbita-v3/salud/HealthCorrelationsPanel"

type ChartRow = { hour: string; vitality: number; recovery: number }

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  timeline: AutoHealthMetric[]
  analytics: ShortcutHealthAnalyticsSnapshot | null
  healthMetricsLoading: boolean
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
          <span className="font-medium" style={{ color: theme.accent.health }}>
            Vitalidad
          </span>{" "}
          (sueño + movimiento): {vitality.value}
        </p>
      ) : null}
      {recovery != null && typeof recovery.value === "number" ? (
        <p className="mt-1" style={{ color: theme.textMuted }}>
          <span className="font-medium" style={{ color: theme.accent.agenda }}>
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
}: Props) {
  const theme = useOrbitaSkin()
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

  return (
    <section className="space-y-8" style={{ color: theme.text }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] border p-7 backdrop-blur-2xl sm:p-9"
        style={saludPanelStyle(theme, 0.88)}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: theme.textMuted }}>
          Estratégico
        </p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <motion.div
              className="rounded-3xl p-4 ring-1"
              style={{
                backgroundColor: saludHexToRgba(theme.accent.health, 0.12),
                color: theme.accent.health,
                boxShadow: `0 0 0 1px ${saludHexToRgba(theme.accent.health, 0.25)}`,
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <HeartPulse className="h-7 w-7" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cuerpo, energía y hábitos</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                Tu check-in del día y la lectura de Apple en un solo lugar. Si no coinciden, priorizamos descanso y
                carga suave.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8" style={{ borderColor: theme.border }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
            Tu check-in (órbita interna)
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Salud emocional", value: health.scoreSalud, meta: "/100", icon: Sparkles },
              { label: "Energía física", value: health.scoreFisico, meta: "/100", icon: Activity },
              { label: "Recuperación percibida", value: health.scoreRecuperacion, meta: "/100", icon: MoonStar },
              { label: "Índice de energía", value: health.bodyBattery, meta: "/100", icon: BatteryCharging },
            ].map((metric, index) => {
              const Icon = metric.icon
              const status = metric.value >= 70 ? "Bien" : metric.value >= 45 ? "En rango" : "Bajo"
              const statusColor =
                metric.value >= 70 ? theme.accent.health : metric.value >= 45 ? theme.accent.agenda : theme.accent.finance
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] border p-5 backdrop-blur-xl"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.65),
                  }}
                >
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: theme.textMuted }}
                    >
                      {metric.label}
                    </span>
                    <span
                    className="rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:text-[10px]"
                      style={{
                        borderColor: saludHexToRgba(statusColor, 0.4),
                        backgroundColor: saludHexToRgba(statusColor, 0.12),
                        color: statusColor,
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <p
                    className="mt-4 text-3xl font-semibold tracking-tight"
                    style={{ color: saludMetricTone(theme, metric.value) }}
                  >
                    {metric.value}
                    <span className="ml-1 text-sm font-medium" style={{ color: theme.textMuted }}>
                      {metric.meta}
                    </span>
                  </p>
                  <div className="mt-3 flex justify-end">
                    <motion.div
                      style={{ color: statusColor }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                      aria-hidden
                    >
                      <Icon className="h-9 w-9 shrink-0 drop-shadow-sm" strokeWidth={1.75} />
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <p
            className="mt-6 rounded-2xl border p-4 text-sm leading-relaxed"
            style={{
              borderColor: theme.border,
              backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.75),
              color: theme.textMuted,
              position: "relative",
              zIndex: 0,
            }}
          >
            {appleReadiness != null && health.scoreSalud > 0
              ? `Apple sugiere ${appleReadiness}/100 de disposición y tú reportas ${health.scoreSalud}/100 en salud. Si divergen, toma el día con más descanso y menos intensidad.`
              : "Cuando llegue tu importación de Apple, cruzaremos esas señales con tu check-in para darte una lectura más accionable."}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] border p-6 backdrop-blur-2xl sm:p-8"
        style={saludPanelStyle(theme, 0.9)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Operativo
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">Bio-stack y combustible</h3>
            <p className="mt-1 max-w-xl text-sm" style={{ color: theme.textMuted }}>
              Protocolos, agua y macros en un solo bloque. El impulso del día mezcla suplementos tomados + hidratación.
            </p>
          </div>
          <div
            className="flex min-w-[140px] items-center gap-3 rounded-2xl border px-4 py-3"
            style={{
              borderColor: saludHexToRgba(theme.accent.health, 0.35),
              backgroundColor: saludHexToRgba(theme.accent.health, 0.08),
            }}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame className="h-7 w-7 shrink-0" style={{ color: theme.accent.health }} aria-hidden />
            </motion.div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                Impulso del día
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: theme.text }}>
                {dayMomentum}
                <span className="text-sm font-semibold">%</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
          <div className="rounded-[22px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Combustible
              </p>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ borderColor: theme.border, color: theme.textMuted }}
                onClick={() => setShowNutrition((v) => !v)}
              >
                {showNutrition ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <div
              className="mt-5 flex items-start gap-3 rounded-2xl border p-4"
              style={{
                borderColor: saludHexToRgba(theme.accent.agenda, 0.35),
                backgroundColor: saludHexToRgba(theme.accent.agenda, 0.1),
              }}
            >
              <motion.div
                style={{ color: theme.accent.agenda }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="mt-0.5 shrink-0"
              >
                <Droplets className="h-7 w-7" aria-hidden />
              </motion.div>
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
                      background: `linear-gradient(90deg, ${theme.accent.agenda}, ${saludHexToRgba(theme.accent.health, 0.85)})`,
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
      </motion.div>

      <div className="rounded-[26px] border p-6 backdrop-blur-2xl sm:p-7" style={saludPanelStyle(theme, 0.82)}>
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
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent.health }} aria-hidden />
            Vitalidad (línea)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-6 rounded-sm" style={{ backgroundColor: saludHexToRgba(theme.accent.agenda, 0.35) }} aria-hidden />
            Recuperación (área)
          </span>
        </div>
        <div className="mt-6 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weeklyChartData}>
              <defs>
                <linearGradient id={energyChartGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent.agenda} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={theme.accent.agenda} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                fill={`url(#${energyChartGradientId})`}
                stroke={theme.accent.agenda}
                strokeWidth={1.2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vitality"
                stroke={theme.accent.health}
                strokeWidth={2.5}
                dot={{ r: 3, fill: theme.surface, stroke: theme.accent.health, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
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
