"use client"

import Link from "next/link"
import { Activity, Landmark, RefreshCw } from "lucide-react"
import { formatInstantInAgendaTz, formatLocalDateLabelEsCo } from "@/lib/agenda/localDateKey"
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

function healthCorrelationLine(h: AppleHealthContextSignals): string | null {
  const sleep = h.sleep_hours
  const hrv = h.hrv_ms
  const pulse = h.energy_index ?? h.readiness_score
  if (sleep != null && hrv != null) {
    const p = pulse ?? 55
    if (p >= 65) {
      return `Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → energía alta.`
    }
    if (p < 52) {
      return `Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → ritmo conservador; prioriza recuperación.`
    }
    return `Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → ritmo equilibrado.`
  }
  if (sleep != null) return `Sueño ~${sleep.toFixed(1)} h registrado en Apple para hoy.`
  if (hrv != null) return `HRV ${hrv} ms: señal de carga autonómica para combinar con el check-in.`
  return null
}

function formatObservedAt(iso: string) {
  const lbl = formatLocalDateLabelEsCo(iso)
  return lbl === "—" ? iso.slice(0, 16) : lbl
}

type Props = {
  capital?: OperationalCapitalSnapshot | null
  health?: AppleHealthContextSignals | null
  className?: string
}

/**
 * Día estratégico: Apple Health (Atajo) + Capital. Inicio / Hoy.
 */
export function StrategicDayHero({ capital, health, className = "" }: Props) {
  if (!capital && !health) return null

  const corr = health ? healthCorrelationLine(health) : null
  const shortcutBadge =
    health?.source === "apple_health_shortcut" ? (
      <p className="m-0 mt-2 text-[10px] font-medium text-[var(--color-accent-health)]">
        Importado vía Atajo · {formatObservedAt(health.observed_at)}
      </p>
    ) : health ? (
      <p className="m-0 mt-2 text-[10px] text-[var(--color-text-secondary)]">
        Apple Health · {formatObservedAt(health.observed_at)}
      </p>
    ) : null

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {health ? (
        <section
          aria-labelledby="strategic-health-hero-heading"
          className="relative overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-accent-health)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_7%,var(--color-surface))] p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--color-border)_80%,transparent)] backdrop-blur-xl sm:p-5"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-[0.12]"
            style={{ background: "var(--color-accent-health)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Activity className="h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                <p
                  id="strategic-health-hero-heading"
                  className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]"
                >
                  Salud · pulso del día
                </p>
              </div>
              {corr ? (
                <p className="m-0 text-[15px] font-medium leading-snug tracking-tight text-[var(--color-text-primary)] sm:text-base">
                  {corr}
                </p>
              ) : (
                <p className="m-0 text-sm text-[var(--color-text-secondary)]">
                  Datos de Apple listos; completa el check-in para afinar el foco.
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
                {health.readiness_score != null ? (
                  <span>
                    Listo:{" "}
                    <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {Math.round(health.readiness_score)}
                    </span>
                  </span>
                ) : null}
                {health.steps != null ? (
                  <span>
                    Pasos:{" "}
                    <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {health.steps.toLocaleString("es-CO")}
                    </span>
                  </span>
                ) : null}
                {health.workouts_count != null ? (
                  <span>
                    Entrenos:{" "}
                    <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {health.workouts_count}
                    </span>
                  </span>
                ) : null}
              </div>
              {shortcutBadge}
            </div>
            <Link
              href="/salud"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-start rounded-[var(--radius-button)] border border-[color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)] motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--color-accent-health)_18%,var(--color-surface))]"
              style={{ textDecoration: "none" }}
            >
              Ver salud
            </Link>
          </div>
        </section>
      ) : null}

      {capital ? (
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
