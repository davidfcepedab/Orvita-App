"use client"

import Link from "next/link"
import clsx from "clsx"
import { motion } from "framer-motion"
import { Activity, Dumbbell, Footprints, Heart, Landmark, RefreshCw, Sparkles } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { formatInstantInAgendaTz, formatLocalDateLabelEsCo, formatStoredYmdLabelEsCo } from "@/lib/agenda/localDateKey"
import type { AppleHealthContextSignals, OperationalCapitalSnapshot } from "@/lib/operational/types"

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)
}

function pressureCopy(p: OperationalCapitalSnapshot["pressure"]): { label: string; tone: string } {
  switch (p) {
    case "alta":
      return { label: "Alta", tone: "text-[var(--color-accent-danger)]" }
    case "media":
      return { label: "Media", tone: "text-[var(--color-accent-warning)]" }
    default:
      return { label: "Baja", tone: "text-[var(--color-accent-health)]" }
  }
}

/** Mensaje principal en lenguaje natural; el detalle con números va aparte y más pequeño. */
function pulseUserCopy(h: AppleHealthContextSignals): { headline: string; detail: string | null } {
  const sleep = h.sleep_hours
  const hrv = h.hrv_ms
  const pulse = h.energy_index ?? h.readiness_score

  if (sleep != null && hrv != null) {
    const p = pulse ?? 55
    let headline: string
    if (p >= 65) {
      headline = "Buena base para moverte: descanso y variabilidad te acompañan."
    } else if (p >= 52) {
      headline = "Ritmo equilibrado: puedes afrontar el día con calma."
    } else {
      headline = "Tu cuerpo pide ir más suave: prioriza recuperación y sueño."
    }
    const detail = `~${sleep.toFixed(1)} h de sueño · variabilidad ${hrv} ms`
    return { headline, detail }
  }
  if (sleep != null) {
    return {
      headline: `Llevamos ~${sleep.toFixed(1)} h de sueño registrados para hoy.`,
      detail: null,
    }
  }
  if (hrv != null) {
    return {
      headline: "Ya tenemos tu variabilidad cardiaca; encaja con el check-in para afinar el foco.",
      detail: `${hrv} ms`,
    }
  }
  return {
    headline: "Cuando lleguen sueño y variabilidad, aquí verás un resumen claro de tu día.",
    detail: null,
  }
}

function readinessTier(score: number | null): { label: string; style: string; showSparkle: boolean } {
  if (score == null || !Number.isFinite(score)) {
    return {
      label: "Sin medición",
      style:
        "border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]",
      showSparkle: false,
    }
  }
  const s = Math.round(score)
  if (s >= 65) {
    return {
      label: "Gran día",
      style:
        "border-[color-mix(in_srgb,var(--color-accent-health)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[var(--color-text-primary)]",
      showSparkle: true,
    }
  }
  if (s >= 52) {
    return {
      label: "En equilibrio",
      style:
        "border-[color-mix(in_srgb,var(--color-accent-agenda)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-agenda)_11%,var(--color-surface))] text-[var(--color-text-primary)]",
      showSparkle: false,
    }
  }
  return {
    label: "Modo recuperación",
    style:
      "border-[color-mix(in_srgb,var(--color-accent-warning)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-surface))] text-[var(--color-text-primary)]",
    showSparkle: false,
  }
}

function ReadinessRing({ score }: { score: number | null }) {
  const n = score != null && Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : null
  const deg = n != null ? (n / 100) * 360 : 0
  return (
    <div
      className="relative shrink-0 rounded-full p-[2.5px] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border)_55%,transparent),0_8px_22px_-10px_color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] h-[3.25rem] w-[3.25rem] sm:h-[4rem] sm:w-[4rem] sm:p-[3px]"
      style={{
        background:
          n != null
            ? `conic-gradient(from -90deg, var(--color-accent-health) ${deg}deg, color-mix(in srgb, var(--color-border) 48%, transparent) 0deg)`
            : "color-mix(in srgb, var(--color-border) 55%, transparent)",
      }}
      aria-label={n != null ? `Disposición aproximada ${n} de 100` : "Sin medición de disposición"}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-surface)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-border)_32%,transparent)]">
        <span className="text-[16px] font-bold tabular-nums leading-none tracking-tight text-[var(--color-text-primary)] sm:text-[18px]">
          {n ?? "—"}
        </span>
      </div>
    </div>
  )
}

function formatObservedAt(iso: string) {
  const lbl = formatLocalDateLabelEsCo(iso)
  return lbl === "—" ? iso.slice(0, 16) : lbl
}

function formatShortcutImportDayLabel(h: AppleHealthContextSignals) {
  const ymd = h.bundle_day_ymd?.trim()
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const lbl = formatStoredYmdLabelEsCo(ymd)
    return lbl === "—" ? ymd : lbl
  }
  return formatObservedAt(h.observed_at)
}

type Props = {
  capital?: OperationalCapitalSnapshot | null
  health?: AppleHealthContextSignals | null
  /** En `/hoy` suele ocultarse el bloque Capital para dejar pulso + check-in. */
  showCapital?: boolean
  className?: string
}

/**
 * Día estratégico: Apple Health (Atajo) + Capital opcional. Inicio / Hoy.
 */
export function StrategicDayHero({
  capital,
  health,
  showCapital = true,
  className = "",
}: Props) {
  const showCapitalBlock = showCapital && Boolean(capital)
  if (!showCapitalBlock && !health) return null

  const pulse = health ? pulseUserCopy(health) : null
  const tier = health ? readinessTier(health.readiness_score ?? null) : null
  const shortcutBadge =
    health?.source === "apple_health_shortcut" ? (
      <p className="m-0 mt-2 text-[10px] text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-accent-health)]">Actualizado desde tu iPhone</span>
        {" · "}
        {formatShortcutImportDayLabel(health)}
      </p>
    ) : health ? (
      <p className="m-0 mt-2 text-[10px] text-[var(--color-text-secondary)]">
        Datos de Apple Salud · {formatObservedAt(health.observed_at)}
      </p>
    ) : null

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {health ? (
        <section aria-labelledby="strategic-health-hero-heading">
          <Card className="overflow-hidden p-0 shadow-[0_1px_0_color-mix(in_srgb,var(--color-border)_80%,transparent)]">
            <div className="relative flex min-w-0 flex-col gap-4 overflow-hidden bg-[var(--color-surface)] p-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 sm:p-5">
              <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col space-y-3 sm:min-h-[108px]">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Activity className="h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                  <div className="min-w-0">
                    <p
                      id="strategic-health-hero-heading"
                      className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]"
                    >
                      Tu pulso de hoy
                    </p>
                    <p className="m-0 mt-0.5 text-[10px] text-[var(--color-text-secondary)]">Apple Salud · vista rápida</p>
                  </div>
                </div>
                {pulse ? (
                  <>
                    <p className="m-0 text-[17px] font-semibold leading-snug tracking-tight text-[var(--color-text-primary)] sm:text-xl">
                      {pulse.headline}
                    </p>
                    {pulse.detail ? (
                      <p className="m-0 text-[12px] leading-snug text-[var(--color-text-secondary)]">{pulse.detail}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="m-0 text-sm leading-snug text-[var(--color-text-secondary)]">
                    Cuando conectes datos, aquí verás un resumen pensado para decidir el ritmo del día.
                  </p>
                )}

                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-stretch sm:gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="col-span-2 flex min-h-[92px] min-w-0 items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_5%,var(--color-surface-alt))] px-2.5 py-3 sm:col-span-1 sm:h-full sm:min-h-[108px] sm:gap-3.5 sm:px-3 sm:py-2.5"
                  >
                    <ReadinessRing score={health.readiness_score ?? null} />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1.5 sm:text-left">
                      <div>
                        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                          Disposición
                        </p>
                        <p className="m-0 mt-0.5 text-[10px] leading-snug text-[var(--color-text-secondary)] sm:text-[11px]">
                          Escala 0–100 · Apple Salud
                        </p>
                        <span className="sr-only">
                          {health.readiness_score != null
                            ? `Puntuación ${Math.round(health.readiness_score)} sobre 100`
                            : "Sin puntuación de disposición"}
                        </span>
                      </div>
                      {tier ? (
                        <span
                          className={clsx(
                            "inline-flex w-fit max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold leading-tight sm:text-[10px]",
                            tier.style,
                          )}
                        >
                          {tier.showSparkle ? <Sparkles className="h-3 w-3 shrink-0 opacity-90" aria-hidden /> : null}
                          <span className="min-w-0">{tier.label}</span>
                        </span>
                      ) : null}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-h-[5.75rem] min-w-0 flex-col justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[var(--color-surface-alt)] px-2 py-3 text-center sm:h-full sm:min-h-[108px] sm:items-stretch sm:justify-center sm:px-3 sm:py-2.5 sm:text-left"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] sm:justify-start">
                      <Footprints className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden />
                      Pasos
                    </div>
                    <p className="m-0 mt-1 text-[15px] font-bold tabular-nums leading-none tracking-tight text-[var(--color-text-primary)] sm:mt-0.5 sm:text-lg">
                      {health.steps != null ? health.steps.toLocaleString("es-CO") : "—"}
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-h-[5.75rem] min-w-0 flex-col justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[var(--color-surface-alt)] px-2 py-3 text-center sm:h-full sm:min-h-[108px] sm:items-stretch sm:justify-center sm:px-3 sm:py-2.5 sm:text-left"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] sm:justify-start">
                      <Dumbbell className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden />
                      Sesiones
                    </div>
                    <p className="m-0 mt-1 text-[15px] font-bold tabular-nums leading-none tracking-tight text-[var(--color-text-primary)] sm:mt-0.5 sm:text-lg">
                      {health.workouts_count != null ? health.workouts_count : "—"}
                    </p>
                  </motion.div>
                </div>

                {shortcutBadge}
              </div>

              <div
                className={clsx(
                  "relative z-[1] flex min-h-0 shrink-0 flex-col gap-2 self-stretch sm:w-[11rem] sm:justify-between",
                  "max-sm:flex-row max-sm:flex-wrap max-sm:border-t max-sm:border-[color-mix(in_srgb,var(--color-border)_82%,transparent)] max-sm:pt-3",
                )}
              >
                <Link
                  href="/salud"
                  className={clsx(
                    "inline-flex w-full flex-1 items-center justify-center gap-1.5 text-center no-underline motion-safe:transition-opacity",
                    "max-sm:min-h-0 max-sm:flex-1 max-sm:border-0 max-sm:bg-transparent max-sm:py-1.5 max-sm:text-[11px] max-sm:font-medium max-sm:text-[var(--color-accent-health)] max-sm:underline max-sm:underline-offset-4 max-sm:decoration-[color-mix(in_srgb,var(--color-accent-health)_40%,transparent)] max-sm:hover:opacity-85",
                    "sm:min-h-0 sm:flex-1 sm:rounded-xl sm:border sm:border-[color-mix(in_srgb,var(--color-accent-health)_38%,var(--color-border))] sm:bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] sm:px-4 sm:py-3 sm:text-xs sm:font-semibold sm:text-[var(--color-text-primary)] sm:hover:opacity-90",
                  )}
                >
                  <Heart className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden />
                  Ver Salud
                </Link>
                <Link
                  href="/training"
                  className={clsx(
                    "inline-flex w-full flex-1 items-center justify-center gap-1.5 text-center no-underline motion-safe:transition-colors",
                    "max-sm:min-h-0 max-sm:flex-1 max-sm:border-0 max-sm:bg-transparent max-sm:py-1.5 max-sm:text-[11px] max-sm:font-medium max-sm:text-[var(--color-text-secondary)] max-sm:underline max-sm:underline-offset-4 max-sm:hover:text-[var(--color-text-primary)]",
                    "sm:min-h-0 sm:flex-1 sm:rounded-xl sm:border sm:border-[var(--color-border)] sm:bg-[var(--color-surface-alt)] sm:px-3 sm:py-3 sm:text-[11px] sm:font-semibold sm:text-[var(--color-text-secondary)] sm:no-underline sm:hover:text-[var(--color-text-primary)]",
                  )}
                >
                  <Dumbbell className="h-3.5 w-3.5 shrink-0 opacity-70 max-sm:hidden sm:inline" aria-hidden />
                  Entrenamiento
                </Link>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {showCapitalBlock && capital ? (
        <section
          aria-labelledby="strategic-capital-hero-heading"
          className="relative overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-accent-finance)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,var(--color-surface))] p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--color-border)_80%,transparent)] backdrop-blur-xl sm:p-5"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-[0.12]"
            style={{ background: "var(--color-accent-finance)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Landmark className="h-4 w-4 shrink-0 text-[var(--color-accent-finance)]" aria-hidden />
                <p
                  id="strategic-capital-hero-heading"
                  className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]"
                >
                  Capital · sistema operativo
                </p>
              </div>
              <p className="m-0 text-lg font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
                Saldo conectado{" "}
                <span className="tabular-nums text-[var(--color-accent-finance)]">{formatCop(capital.totalBalanceCop)}</span>
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-secondary)]">
                <span>
                  Flujo neto (mes):{" "}
                  <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                    {formatCop(capital.monthlyNetCop)}
                  </span>
                </span>
                <span className={`font-semibold ${pressureCopy(capital.pressure).tone}`}>
                  Presión {pressureCopy(capital.pressure).label}
                </span>
              </div>
              <p className="m-0 flex flex-wrap items-center gap-1.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                <RefreshCw className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                <span>
                  Última sync bancaria:{" "}
                  <span className="text-[var(--color-text-primary)]">
                    {capital.lastBankSyncAt ? formatInstantInAgendaTz(capital.lastBankSyncAt) : "Sin sincronizar"}
                  </span>
                  {capital.connectedAccounts > 0 ? (
                    <span className="text-[var(--color-text-secondary)]">
                      {" "}
                      · {capital.connectedAccounts} cuenta
                      {capital.connectedAccounts === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {capital.belvoSandbox && capital.sandboxDegraded ? (
                    <span className="text-[var(--color-text-secondary)]"> · Sandbox BR mock (CO pendiente)</span>
                  ) : null}
                </span>
              </p>
            </div>
            <Link
              href="/finanzas/overview"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-start rounded-[var(--radius-button)] border border-[color-mix(in_srgb,var(--color-accent-finance)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)] motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_18%,var(--color-surface))]"
              style={{ textDecoration: "none" }}
            >
              Ver Capital
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** @deprecated Usa `StrategicDayHero` (mismo componente; nombre histórico). */
export const StrategicDayCapitalHero = StrategicDayHero
