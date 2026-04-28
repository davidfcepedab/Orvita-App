"use client"

import Link from "next/link"
import { Landmark, RefreshCw } from "lucide-react"
import type { OperationalCapitalSnapshot } from "@/lib/operational/types"

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

type Props = {
  capital: OperationalCapitalSnapshot | null | undefined
  className?: string
}

/**
 * Resumen Capital + Belvo para el día estratégico (Inicio / Hoy).
 * Glass suave, espacio generoso, copy LATAM.
 */
export function StrategicDayCapitalHero({ capital, className = "" }: Props) {
  if (!capital) return null

  const { label, tone } = pressureCopy(capital.pressure)
  const syncLabel = capital.lastBankSyncAt
    ? new Date(capital.lastBankSyncAt).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin sincronizar"

  const sandboxNote =
    capital.belvoSandbox && capital.sandboxDegraded ? " · Sandbox BR mock (CO pendiente)" : ""

  return (
    <section
      aria-labelledby="strategic-capital-hero-heading"
      className={`relative overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-accent-finance)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,var(--color-surface))] p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--color-border)_80%,transparent)] backdrop-blur-xl sm:p-5 ${className}`}
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
            <span className={`font-semibold ${tone}`}>Presión {label}</span>
          </div>
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            <RefreshCw className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
            <span>
              Última sync bancaria: <span className="text-[var(--color-text-primary)]">{syncLabel}</span>
              {capital.connectedAccounts > 0 ? (
                <span className="text-[var(--color-text-secondary)]">
                  {" "}
                  · {capital.connectedAccounts} cuenta
                  {capital.connectedAccounts === 1 ? "" : "s"}
                </span>
              ) : null}
              {sandboxNote ? <span className="text-[var(--color-text-secondary)]">{sandboxNote}</span> : null}
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
  )
}
