"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BedDouble, ChevronDown, Dumbbell, Lightbulb, MoonStar, Settings, Sparkles, Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { buildOrvitaRunShortcutHref, ORVITA_HEALTH_SHORTCUT_NAME } from "@/lib/shortcuts/orvitaHealthShortcut"
import { appleHealthSyncStale, buildAppleHealthSyncChip } from "@/lib/salud/appleHealthSyncToolbar"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  loading: boolean
  onRefresh: () => Promise<void>
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

export default function AppleHealthLuxurySection({ salud, latest, loading, onRefresh }: Props) {
  const theme = useOrbitaSkin()

  const panel = useMemo(() => saludPanelStyle(theme, 0.9), [theme])
  const weekAvg = useMemo(() => {
    const r = salud.trendAverage || salud.scoreSalud
    return typeof r === "number" && r > 0 ? r : salud.scoreSalud || 60
  }, [salud.scoreSalud, salud.trendAverage])

  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const staleSync = appleHealthSyncStale(latest?.observed_at)
  const syncChip = useMemo(() => buildAppleHealthSyncChip(latest), [latest])

  const dayState = useMemo(() => {
    const readiness = latest?.readiness_score
    const checkin = salud.scoreSalud
    const systemScore = Math.max(0, Math.min(100, Math.round(((readiness ?? checkin) + checkin) / 2)))
    if (readiness == null) {
      return {
        label: "Info",
        title: "Falta lectura Apple para cerrar estado del día",
        score: systemScore,
        actions: ["Ejecuta Atajo y refresca lectura", "Mantén carga moderada hasta validar Apple"],
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
          <div className="max-w-3xl space-y-2.5">
            <h1 className="m-0 text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              Datos automáticos, con calma y precisión
            </h1>
            <p className="m-0 text-sm leading-relaxed sm:text-[15px]" style={{ color: theme.textMuted }}>
              Los datos llegan cuando ejecutas el atajo en el iPhone (Salud no lista Órvita como app). El token lo
              configuras en Configuración; en Salud solo ves lo que ya guardó tu cuenta.
            </p>
          </div>

          <details
            className="group rounded-xl border"
            style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
          >
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {/* Cerrado: fila + acciones rápidas (se ocultan al expandir para no duplicar UI) */}
              <div className="space-y-3 px-3 py-3 sm:px-4 group-open:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                    <span
                      className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: theme.textMuted }}
                    >
                      Apple Health
                    </span>
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
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: theme.textMuted }}
                  >
                    Detalles
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: theme.textMuted }} aria-hidden />
                  </span>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones rápidas Apple Health">
                  <a
                    href={runShortcutHref}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold text-white no-underline transition active:scale-[0.99]"
                    style={{ backgroundColor: SALUD_SEM.energy }}
                    title="Abre el atajo en el iPhone para enviar el día"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Zap className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                    Ejecutar atajo
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onRefresh()
                    }}
                    disabled={loading}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-medium transition active:scale-[0.99] disabled:opacity-50"
                    style={{
                      borderColor: saludHexToRgba(theme.border, 0.85),
                      backgroundColor: "transparent",
                      color: theme.text,
                    }}
                    title="Recarga desde Órvita lo último que envió el atajo"
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
                    title="Configurar token del Atajo en Configuración"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    Token en Configuración
                  </Link>
                </div>
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
                  title="Abre el atajo en el iPhone para enviar el día"
                >
                  <Zap className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                  Ejecutar atajo
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
                  title="Recarga desde Órvita lo último que envió el atajo"
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
                  title="Configurar token del Atajo en Configuración"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Token en Configuración
                </Link>
              </div>
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                Cómo se sincroniza (orden)
              </p>
              <ol className="m-0 list-decimal space-y-2.5 pl-4 text-xs leading-relaxed sm:text-[13px]" style={{ color: theme.text }}>
                <li>
                  <strong className="font-medium text-inherit">Una vez en la web:</strong> en{" "}
                  <Link
                    href="/configuracion#apple-health-import-token"
                    className="font-medium underline underline-offset-2"
                    style={{ color: SALUD_SEM.energy }}
                  >
                    Configuración → token de importación
                  </Link>
                  , genera el token y configúralo en el atajo (cabecera{" "}
                  <span className="rounded bg-black/[0.06] px-1 font-mono text-[11px] dark:bg-white/[0.08]">x-orvita-import-token</span>
                  ). No caduca por tiempo; solo cambia si lo regeneras o revocas.
                </li>
                <li>
                  <strong className="font-medium text-inherit">Cuando quieras datos del día:</strong> en el iPhone, ejecuta el
                  atajo <span className="font-medium text-inherit">{ORVITA_HEALTH_SHORTCUT_NAME}</span> (o el que instalaste con el mismo flujo).
                  Eso envía el resumen a Órvita.
                </li>
                <li>
                  <strong className="font-medium text-inherit">Aquí en Salud:</strong> toca{" "}
                  <strong className="font-medium text-inherit">Actualizar lectura</strong> para traer a la pantalla lo que el servidor ya guardó.
                  Si el chip muestra fecha vieja, suele faltar ejecutar el atajo o refrescar.
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
                Abrir Configuración (token y guía del atajo)
              </Link>
            </div>
          </details>
        </div>

        <div className="relative border-t pt-6" style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Estado del día
              </p>
              <h2 className="m-0 mt-2 text-lg font-semibold tracking-tight sm:text-xl" style={{ color: theme.text }}>
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
            <div className="flex shrink-0 flex-col items-end gap-2 sm:pt-1">
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
        </div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Recuperación",
              tint: SALUD_SEM.recovery,
              icon: MoonStar,
              rows: [
                { k: "Sueño", v: sleepLabel },
                { k: "HRV", v: hrvLabel },
              ],
            },
            {
              label: "Movimiento",
              tint: SALUD_SEM.energy,
              icon: Zap,
              rows: [
                { k: "Pasos", v: stepsLabel },
                { k: "Energía activa", v: kcalLabel },
              ],
            },
            {
              label: "Estado general",
              tint: SALUD_SEM.uiBlue,
              icon: Sparkles,
              rows: [
                { k: "Check-in", v: `${salud.scoreSalud}/100` },
                { k: "Sync Apple", v: staleSync ? "Desactualizado" : latest?.observed_at ? "Al día" : "Pendiente" },
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
