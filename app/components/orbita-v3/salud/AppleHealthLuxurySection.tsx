"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BedDouble, ChevronDown, Dumbbell, Lightbulb, MoonStar, RefreshCw, Settings, Sparkles, Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { ShortcutHealthAnalyticsSnapshot } from "@/lib/health/shortcutHealthAnalytics"
import { AppleShortcutAnalyticsPanels } from "@/app/health/AppleShortcutAnalyticsSection"
import { buildOrvitaRunShortcutHref, ORVITA_HEALTH_SHORTCUT_NAME } from "@/lib/shortcuts/orvitaHealthShortcut"
import {
  appleHealthSyncStaleFromMetric,
  buildAppleHealthSyncChip,
  buildAppleHealthSyncChipCompact,
} from "@/lib/salud/appleHealthSyncToolbar"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  loading: boolean
  onRefresh: () => Promise<void>
  /** Rejilla “última lectura / ritmo / tendencia” del atajo (misma data que el antiguo bloque aparte). */
  analytics?: ShortcutHealthAnalyticsSnapshot | null
}

function estadoChipColors(label: string): { fg: string; bg: string } {
  switch (label) {
    case "Listo":
      return { fg: SALUD_SEM.ok, bg: saludHexToRgba(SALUD_SEM.ok, 0.14) }
    case "Recuperar":
      return { fg: SALUD_SEM.recovery, bg: saludHexToRgba(SALUD_SEM.recovery, 0.14) }
    case "Moderar":
      return { fg: SALUD_SEM.warn, bg: saludHexToRgba(SALUD_SEM.warn, 0.14) }
    case "Info":
      return { fg: SALUD_SEM.neutral, bg: saludHexToRgba(SALUD_SEM.neutral, 0.12) }
    default:
      return { fg: SALUD_SEM.warn, bg: saludHexToRgba(SALUD_SEM.warn, 0.12) }
  }
}

function recoveryNarrative(readiness: number | null | undefined, weekAvg: number) {
  if (readiness === null || readiness === undefined) {
    return "Cuando conectes Apple Health, aquí verás una lectura clara de tu recuperación y cómo se alinea con tu semana."
  }
  const delta = Math.round(readiness - weekAvg)
  if (delta <= -8) {
    return `Tu recuperación está en ${readiness}: un poco por debajo de tu promedio semanal (${Math.round(weekAvg)}). Vale la pena proteger el sueño y bajar el ritmo hoy.`
  }
  if (delta >= 8) {
    return `Tu recuperación está en ${readiness}: por encima de tu promedio semanal (${Math.round(weekAvg)}). Buen momento para aprovechar energía, sin olvidar descansar.`
  }
  return `Tu recuperación está en ${readiness}, en línea con tu promedio semanal (${Math.round(weekAvg)}). Mantén hábitos simples: sueño constante, hidratación y movimiento amable.`
}

/** Solo campos que entran por el pipeline Apple → Órvita (shortcut / métricas). */
function formatWorkoutDuration(latest: AutoHealthMetric | null): string {
  if (!latest) return "Sin dato"
  const min = latest.apple_workout_minutes
  if (min != null && min > 0) return `${Math.round(min)} min`
  const count = latest.apple_workouts_count
  if (count != null && count > 0) return `${count} sesión${count === 1 ? "" : "es"}`
  return "Sin dato"
}

export default function AppleHealthLuxurySection({ salud, latest, loading, onRefresh, analytics = null }: Props) {
  const theme = useOrbitaSkin()

  const panel = useMemo(() => saludPanelStyle(theme, 0.9), [theme])
  const weekAvg = useMemo(() => {
    const r = salud.trendAverage || salud.scoreSalud
    return typeof r === "number" && r > 0 ? r : salud.scoreSalud || 60
  }, [salud.scoreSalud, salud.trendAverage])

  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const staleSync = appleHealthSyncStaleFromMetric(latest)
  const syncChipSummary = useMemo(() => buildAppleHealthSyncChipCompact(latest), [latest])
  const syncChip = useMemo(() => buildAppleHealthSyncChip(latest), [latest])

  const dayState = useMemo(() => {
    const readiness = latest?.readiness_score
    const checkin = salud.scoreSalud
    const systemScore = Math.max(0, Math.min(100, Math.round(((readiness ?? checkin) + checkin) / 2)))
    if (readiness == null) {
      return {
        label: "Info",
        title: "Faltan datos recientes de Apple Health",
        score: systemScore,
        actions: ["Ejecuta el atajo y actualiza la lectura", "Mantén intensidad moderada hasta tener señal"],
      }
    }
    const divergence = Math.round(readiness - checkin)
    if (!staleSync && readiness >= 68 && checkin >= 60 && Math.abs(divergence) <= 12) {
      return {
        label: "Listo",
        title: "Tu sistema está listo para una carga útil",
        score: systemScore,
        actions: ["Mantén sesión planificada", "Protege hidratación y cierre de sueño"],
      }
    }
    if (readiness < 50 || checkin < 45 || divergence <= -18) {
      return {
        label: "Recuperar",
        title: "Hoy conviene priorizar recuperación",
        score: systemScore,
        actions: ["Reduce intensidad y volumen", "Prioriza descanso + movilidad"],
      }
    }
    return {
      label: "Moderar",
      title: "Estado intermedio: avanza con control",
      score: systemScore,
      actions: ["Entrena en zona técnica", "Evalúa sensación al terminar"],
    }
  }, [latest?.readiness_score, salud.scoreSalud, staleSync])

  if (salud.loading) {
    return (
      <div
        className="rounded-[32px] border p-8 text-sm backdrop-blur-2xl"
        style={{ ...panel, color: theme.textMuted }}
      >
        Estamos preparando tu panel de salud…
      </div>
    )
  }

  if (salud.error) {
    return (
      <div className="rounded-[32px] border border-red-400/40 bg-red-500/10 p-8 text-sm text-red-700 backdrop-blur-2xl dark:text-red-100">
        {salud.error}
      </div>
    )
  }

  const chipSem = estadoChipColors(dayState.label)
  const sleepLabel =
    latest?.sleep_hours != null ? `${Math.round(latest.sleep_hours * 10) / 10} h` : "Sin dato"
  const hrvLabel = latest?.hrv_ms != null ? `${latest.hrv_ms} ms` : "Sin dato"
  const rhrLabel = latest?.resting_hr_bpm != null ? `${latest.resting_hr_bpm} bpm` : "Sin dato"
  const stepsLabel = latest?.steps != null ? latest.steps.toLocaleString("es-LA") : "Sin dato"
  const kcalLabel =
    latest?.calories != null ? `${Math.round(latest.calories).toLocaleString("es-LA")} kcal` : "Sin dato"
  const workoutLine = formatWorkoutDuration(latest)

  return (
    <motion.section
      role="region"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{ ...panel, boxShadow: "none" }}
      aria-label="Apple Health"
    >
      <div className="relative flex flex-col gap-7 p-5 sm:p-7" style={{ color: theme.text }}>
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl space-y-2">
            <h1 className="m-0 text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
              Datos automáticos, con calma y precisión
            </h1>
            <p className="m-0 max-w-prose text-sm leading-relaxed text-pretty opacity-95" style={{ color: theme.textMuted }}>
              Los datos vienen del atajo en el iPhone (no de la app Salud). Clave única en{" "}
              <Link href="/configuracion#apple-health-import-token" className="font-medium underline underline-offset-2" style={{ color: SALUD_SEM.energy }}>
                Configuración
              </Link>
              ; cópiala al atajo.
            </p>
          </div>

          <details
            className="group rounded-xl border"
            style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
          >
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {/* Cerrado: solo Apple Health + atajo + chip sync (resto al expandir) */}
              <div className="group-open:hidden flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] opacity-80" style={{ color: theme.textMuted }}>
                  Apple
                </span>
                <a
                  href={runShortcutHref}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white no-underline transition active:scale-[0.98]"
                  style={{ backgroundColor: SALUD_SEM.energy }}
                  aria-label="Traer datos de hoy (Atajo)"
                  title="Traer hoy — atajo iPhone"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </a>
                <span
                  className="inline-flex min-w-0 max-w-[min(100%,18rem)] flex-1 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-medium leading-tight sm:max-w-[20rem] sm:text-[10px]"
                  style={{
                    borderColor: saludHexToRgba(syncChipSummary.fg, 0.22),
                    backgroundColor: syncChipSummary.bg,
                    color: syncChipSummary.fg,
                  }}
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-80" aria-hidden />
                  <span className="min-w-0 truncate">{syncChipSummary.label}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void onRefresh()
                  }}
                  disabled={loading}
                  className="orbita-focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    borderColor: saludHexToRgba(theme.border, 0.75),
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.45),
                    color: theme.text,
                  }}
                  title={loading ? "Actualizando…" : "Actualizar lectura (últimos datos en cuenta)"}
                  aria-label={loading ? "Actualizando lectura" : "Actualizar lectura"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
                </button>
                <span className="ml-auto inline-flex shrink-0 items-center opacity-50" style={{ color: theme.textMuted }}>
                  <span className="sr-only">Abrir detalles de sincronización</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </span>
              </div>
              {/* Abierto: solo barra para cerrar (sin duplicar atajo / token en la misma franja) */}
              <div
                className="hidden items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4 group-open:flex"
                style={{ borderColor: saludHexToRgba(theme.border, 0.5) }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                  Sincronización
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                  Ocultar
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 rotate-180 transition"
                    style={{ color: theme.textMuted }}
                    aria-hidden
                  />
                </span>
              </div>
            </summary>
            <div className="space-y-3 px-3 pb-4 pt-3 sm:px-4 sm:pb-4">
              <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Sincronización Apple Health">
                <span
                  className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-snug sm:max-w-[min(100%,20rem)] sm:px-3 sm:text-[11px]"
                  style={{
                    backgroundColor: syncChip.bg,
                    color: syncChip.fg,
                  }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
                  {syncChip.label}
                </span>
                <a
                  href={runShortcutHref}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold text-white no-underline transition active:scale-[0.99]"
                  style={{ backgroundColor: SALUD_SEM.energy }}
                  title="Abre el atajo en el iPhone y envía el resumen del día"
                >
                  <Zap className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                  Enviar datos de hoy
                </a>
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  disabled={loading}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-medium transition active:scale-[0.99] disabled:opacity-50"
                  style={{
                    borderColor: saludHexToRgba(theme.border, 0.85),
                    backgroundColor: "transparent",
                    color: theme.text,
                  }}
                  title="Trae a esta pantalla lo último que ya llegó a tu cuenta"
                >
                  {loading ? "Actualizando…" : "Actualizar lectura"}
                </button>
                <Link
                  href="/configuracion#apple-health-import-token"
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold no-underline transition active:scale-[0.99] sm:px-3"
                  style={{
                    borderColor: saludHexToRgba(theme.border, 0.85),
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.35),
                    color: theme.text,
                  }}
                  title="Crear o cambiar la clave del atajo"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Clave en Configuración
                </Link>
              </div>
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                Tres pasos, en orden
              </p>
              <ol className="m-0 list-decimal space-y-2.5 pl-4 text-xs leading-relaxed sm:text-[13px]" style={{ color: theme.text }}>
                <li>
                  <strong className="font-medium text-inherit">En la web, una vez:</strong> entra en{" "}
                  <Link
                    href="/configuracion#apple-health-import-token"
                    className="font-medium underline underline-offset-2"
                    style={{ color: SALUD_SEM.energy }}
                  >
                    Configuración
                  </Link>
                  , crea la clave y cópiala al atajo del iPhone cuando te la pida. No caduca sola; solo la cambias si pulsas
                  generar otra o desactivar en Configuración.
                </li>
                <li>
                  <strong className="font-medium text-inherit">Cuando quieras actualizar:</strong> en el iPhone abre Atajos y ejecuta{" "}
                  <span className="font-medium text-inherit">{ORVITA_HEALTH_SHORTCUT_NAME}</span>. Eso manda el resumen del día a tu cuenta.
                </li>
                <li>
                  <strong className="font-medium text-inherit">Aquí en Salud:</strong> toca{" "}
                  <strong className="font-medium text-inherit">Actualizar lectura</strong> para ver en pantalla lo que ya guardamos. Si la fecha se ve
                  antigua, suele faltar ejecutar el atajo o pulsar actualizar otra vez.
                </li>
              </ol>
              <Link
                href="/configuracion#apple-health-import-token"
                className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold no-underline transition active:scale-[0.99] sm:w-auto"
                style={{
                  borderColor: saludHexToRgba(theme.border, 0.85),
                  backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.5),
                  color: theme.text,
                }}
              >
                <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                Ir a Configuración (clave y descarga del atajo)
              </Link>
            </div>
          </details>
        </div>

        <div className="relative pt-6">
          {/* Resumen (estado del día + puntuación) antes del titular y las acciones concretas. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex shrink-0 flex-col items-start gap-3 sm:pt-1">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Estado del día
              </p>
              <div className="flex flex-col items-start gap-2">
                <span className="text-4xl font-extrabold tabular-nums leading-none sm:text-5xl" style={{ color: chipSem.fg }}>
                  {dayState.score}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] sm:px-3.5 sm:py-1.5 sm:text-xs"
                  style={{ backgroundColor: chipSem.bg, color: chipSem.fg }}
                >
                  {dayState.label}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-lg font-semibold tracking-tight sm:text-xl" style={{ color: theme.text }}>
                {dayState.title}
              </h2>
              <ol className="m-0 mt-3 list-none space-y-2.5 p-0 sm:mt-4 sm:space-y-3">
                {dayState.actions.map((action, idx) => {
                  const Icon = idx === 0 ? Dumbbell : BedDouble
                  return (
                    <li key={action} className="flex items-start gap-2.5 sm:gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums sm:h-7 sm:w-7 sm:text-xs"
                        style={{
                          backgroundColor: chipSem.bg,
                          color: chipSem.fg,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <motion.span
                        className="mt-0.5 inline-flex shrink-0"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.15 }}
                        aria-hidden
                      >
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.65} style={{ color: chipSem.fg }} />
                      </motion.span>
                      <p className="m-0 min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-[15px]">{action}</p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Recuperación",
              tint: SALUD_SEM.recovery,
              icon: MoonStar,
              rows: [
                { k: "Sueño", v: sleepLabel },
                { k: "VFC", v: hrvLabel },
                { k: "FC reposo", v: rhrLabel },
              ],
            },
            {
              label: "Movimiento",
              tint: SALUD_SEM.energy,
              icon: Zap,
              rows: [
                { k: "Pasos", v: stepsLabel },
                { k: "Energía activa", v: kcalLabel },
                { k: "Entreno", v: workoutLine },
              ],
            },
            {
              label: "Estado general",
              tint: SALUD_SEM.uiBlue,
              icon: Sparkles,
              rows: [
                { k: "Tu registro", v: `${salud.scoreSalud}/100` },
                { k: "Datos de Apple", v: staleSync ? "Desactualizados" : latest?.observed_at ? "Al día" : "Pendiente" },
              ],
            },
          ].map((group) => {
            const Icon = group.icon
            return (
              <div
                key={group.label}
                className="rounded-2xl p-4 sm:p-5"
                style={{
                  backgroundColor: saludHexToRgba(group.tint, 0.1),
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                    {group.label}
                  </p>
                  <motion.div
                    style={{ color: group.tint }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.65} />
                  </motion.div>
                </div>
                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  {group.rows.map((row) => (
                    <div key={row.k} className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-medium sm:text-xs" style={{ color: theme.textMuted }}>
                        {row.k}
                      </span>
                      <span className="max-w-[55%] text-right text-lg font-bold tabular-nums leading-tight sm:text-xl" style={{ color: theme.text }}>
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative space-y-4 border-t pt-6" style={{ borderColor: saludHexToRgba(theme.border, 0.45) }}>
          <div className="space-y-1">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
              Ritmo y tendencia
            </p>
            {latest?.observed_at ? (
              <p className="m-0 text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                Misma lectura que las tarjetas de arriba · actualizado{" "}
                <span className="font-semibold tabular-nums" style={{ color: theme.text }}>
                  {latest.observed_at.slice(0, 10)}
                </span>
              </p>
            ) : (
              <p className="m-0 text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                Cuando llegue un envío del atajo, verás aquí el ritmo interpretado y la tendencia semanal.
              </p>
            )}
          </div>
          <AppleShortcutAnalyticsPanels latest={latest} analytics={analytics} loading={loading} layout="luxury" />
        </div>

        <div
          className="flex gap-3 border-t pt-6"
          style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
        >
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 sm:h-6 sm:w-6" style={{ color: SALUD_SEM.warn }} aria-hidden />
          <div className="min-w-0 space-y-1.5">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-[11px]" style={{ color: theme.textMuted }}>
              Sugerencia del sistema
            </p>
            <p className="m-0 text-sm leading-relaxed sm:text-[15px]" style={{ color: theme.text }}>
              {recoveryNarrative(latest?.readiness_score, weekAvg)}
            </p>
            <p className="m-0 text-xs leading-relaxed sm:text-sm" style={{ color: theme.textMuted }}>
              Check-in: {salud.scoreSalud}/100. Si Apple sube y tú te sientes bajo, prioriza descanso y baja carga.
              {workoutLine !== "Sin dato" ? ` Entreno (Apple): ${workoutLine}.` : ""}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
