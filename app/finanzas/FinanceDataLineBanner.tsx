"use client"

import { Card } from "@/src/components/ui/Card"
import {
  formatInstantInAgendaTz,
  formatLocalDateFullShortEsCo,
  formatYmLongMonthYearEsCo,
} from "@/lib/agenda/localDateKey"
import type { FinanceModuleMeta } from "@/lib/finanzas/financeModuleMeta"
import { cn } from "@/lib/utils"
import { financeInsetBarClass } from "./_components/financeChrome"
import { useFinance } from "./FinanceContext"

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value || 0))
}

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

type FinanceDataLineBannerProps = {
  /** Dentro del hero del layout: mismo card, sin segunda caja con borde propio. */
  embedded?: boolean
}

export function FinanceDataLineBanner({ embedded = false }: FinanceDataLineBannerProps) {
  const finance = useFinance()
  if (!finance || !supabaseEnabled) return null

  const { month, setMonth, financeMeta, financeMetaLoading, financeMetaNotice } = finance

  const datosShell = embedded
    ? "mt-1.5 border-t border-orbita-border/55 pt-1.5 text-orbita-primary sm:mt-2 sm:pt-2.5 md:pt-3"
    : `min-w-0 ${financeInsetBarClass} text-orbita-primary`

  if (financeMetaLoading && !financeMeta) {
    return (
      <div
        className={
          embedded
            ? "mt-1.5 border-t border-orbita-border/55 pt-1.5 sm:mt-2 sm:pt-2.5 md:pt-3"
            : `min-w-0 ${financeInsetBarClass}`
        }
        role="status"
        aria-live="polite"
      >
        <p className="m-0 text-[11px] text-orbita-secondary">Cargando resumen del mes…</p>
      </div>
    )
  }

  const meta = financeMeta as FinanceModuleMeta | null
  if (!meta) return null

  const origenResumenLabel =
    meta.kpiSource === "transactions"
      ? "Movimientos del mes"
      : meta.kpiSource === "snapshot"
        ? "Resumen guardado"
        : "Sin fuente"

  const kpiHasSignal = meta.kpiHasSignal

  const updatedShort = meta.lastTransactionUpdatedAt ? formatInstantInAgendaTz(meta.lastTransactionUpdatedAt) : null

  return (
    <div className="min-w-0 space-y-2">
      {financeMetaNotice ? (
        <p className="m-0 rounded-lg border border-orbita-border bg-orbita-surface px-3 py-1.5 text-[11px] leading-snug text-orbita-secondary">
          {financeMetaNotice}
        </p>
      ) : null}

      <div className={cn(datosShell, "min-w-0 max-w-full")} role="region" aria-label="Actividad e importes del mes elegido">
        <p className="m-0 min-w-0 max-w-full text-[10px] leading-snug text-orbita-primary [overflow-wrap:anywhere] sm:text-[11px] sm:leading-relaxed md:text-xs">
          <span className="font-semibold uppercase tracking-[0.1em] text-orbita-secondary sm:tracking-[0.12em]">Datos</span>{" "}
          <span className="text-orbita-secondary">·</span>{" "}
          <span>
            <span className="text-orbita-secondary">Mov.:</span> {meta.transactionsInSelectedMonth ?? 0}
          </span>{" "}
          <span className="text-orbita-secondary">·</span>{" "}
          <span>
            <span className="text-orbita-secondary">Origen:</span> {origenResumenLabel}
          </span>
          {meta.lastTransactionDate ? (
            <>
              {" "}
              <span className="text-orbita-secondary">·</span>{" "}
              <span>
                <span className="text-orbita-secondary">Último:</span> {formatLocalDateFullShortEsCo(meta.lastTransactionDate)}
                {updatedShort ? (
                  <span className="text-orbita-secondary">
                    {" "}
                    (<span className="whitespace-nowrap">act. {updatedShort}</span>)
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <>
              {" "}
              <span className="text-orbita-secondary">·</span>{" "}
              <span className="text-orbita-secondary">Sin movimientos este mes.</span>
            </>
          )}
        </p>
      </div>

      {!kpiHasSignal && meta.reference ? (
        <Card
          className={`min-w-0 border border-dashed border-[color-mix(in_srgb,var(--color-accent-finance)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,var(--color-surface))] p-3 sm:p-4 ${embedded ? "mt-1" : ""}`}
        >
          <p className="m-0 text-sm font-semibold text-orbita-primary">Sin cifras para {formatYmLongMonthYearEsCo(month)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-orbita-secondary">
            Último mes con resumen guardado:
          </p>
          <div className="mt-2 grid gap-2 rounded-xl border border-orbita-border bg-orbita-surface px-3 py-2.5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-orbita-secondary">Mes</p>
              <p className="font-medium text-orbita-primary">{formatYmLongMonthYearEsCo(meta.reference.month)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-orbita-secondary">Ingresos / Gastos</p>
              <p className="tabular-nums text-orbita-primary">
                ${formatMoney(meta.reference.income)} / ${formatMoney(meta.reference.expense)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-orbita-secondary">Balance</p>
              <p className="tabular-nums font-medium text-orbita-primary">${formatMoney(meta.reference.balance)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMonth(meta.reference!.month)}
            className="mt-2 min-h-[44px] w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-orbita-primary transition hover:bg-orbita-surface-alt sm:mt-3 sm:w-auto"
          >
            Abrir {meta.reference.month}
          </button>
        </Card>
      ) : null}
    </div>
  )
}
