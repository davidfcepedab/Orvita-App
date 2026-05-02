"use client"

import { Activity } from "lucide-react"
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

/** Avisos y bloque “sin cifras” — entre la franja de datos y las pestañas en el layout unificado. */
export function FinanceLedgerAlerts({ embedded = false }: { embedded?: boolean }) {
  const finance = useFinance()
  if (!finance || !supabaseEnabled) return null

  const { month, setMonth, financeMeta, financeMetaLoading, financeMetaNotice } = finance

  if (financeMetaLoading && !financeMeta) return null

  const meta = financeMeta as FinanceModuleMeta | null
  if (!meta) return null

  const kpiHasSignal = meta.kpiHasSignal

  if (!financeMetaNotice && (kpiHasSignal || !meta.reference)) return null

  return (
    <div className={cn("min-w-0 space-y-2", embedded && "mx-3 mb-1.5 mt-2 sm:mx-4")}>
      {financeMetaNotice ? (
        <p className="m-0 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_28%,transparent)] px-3 py-1.5 text-[11px] leading-snug text-orbita-secondary">
          {financeMetaNotice}
        </p>
      ) : null}

      {!kpiHasSignal && meta.reference ? (
        <Card className="min-w-0 border border-dashed border-[color-mix(in_srgb,var(--color-accent-finance)_36%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_5%,var(--color-surface))] p-3 sm:p-4">
          <p className="m-0 text-sm font-semibold text-orbita-primary">Sin cifras para {formatYmLongMonthYearEsCo(month)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-orbita-secondary">Último mes con resumen guardado:</p>
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

type FinanceDataLineBannerProps = {
  /** Dentro del hero del layout: mismo card, sin segunda caja con borde propio. */
  embedded?: boolean
  /** Tras el selector de mes: línea compacta con icono (debajo del hero, antes de alertas/pestañas). */
  footerRail?: boolean
}

export function FinanceDataLineBanner({ embedded = false, footerRail = false }: FinanceDataLineBannerProps) {
  const finance = useFinance()
  if (!finance || !supabaseEnabled) return null

  const { financeMeta, financeMetaLoading } = finance

  const datosShell =
    embedded && footerRail
      ? "border-t border-[color-mix(in_srgb,var(--color-border)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,color-mix(in_srgb,var(--color-surface-alt)_18%,var(--color-surface)))] px-3 py-1.5 sm:px-4 sm:py-1.5"
      : embedded
        ? "mt-1.5 border-t border-orbita-border/55 pt-1.5 text-orbita-primary sm:mt-2 sm:pt-2.5 md:pt-3"
        : `min-w-0 ${financeInsetBarClass} text-orbita-primary`

  if (financeMetaLoading && !financeMeta) {
    return (
      <div
        className={
          embedded && footerRail
            ? "border-t border-[color-mix(in_srgb,var(--color-border)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,color-mix(in_srgb,var(--color-surface-alt)_18%,var(--color-surface)))] px-3 py-1.5 sm:px-4 sm:py-1.5"
            : embedded
              ? "mt-1.5 border-t border-orbita-border/55 pt-1.5 sm:mt-2 sm:pt-2.5 md:pt-3"
              : `min-w-0 ${financeInsetBarClass}`
        }
        role="status"
        aria-live="polite"
      >
        {embedded && footerRail ? (
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-finance)] opacity-50" strokeWidth={2} aria-hidden />
            <p className={cn("m-0 text-orbita-secondary", "text-[10px] sm:text-[11px]")}>Cargando resumen del mes…</p>
          </div>
        ) : (
          <p className="m-0 text-[11px] text-orbita-secondary">Cargando resumen del mes…</p>
        )}
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

  const origenCorto =
    meta.kpiSource === "transactions" ? null : meta.kpiSource === "snapshot" ? "resumen guardado" : "sin fuente"

  const updatedShort = meta.lastTransactionUpdatedAt ? formatInstantInAgendaTz(meta.lastTransactionUpdatedAt) : null

  return (
    <div className={cn(!(embedded && footerRail) && "min-w-0 space-y-2")}>
      <div className={cn(datosShell, "min-w-0 max-w-full")} role="region" aria-label="Actividad e importes del mes elegido">
        {embedded && footerRail ? (
          <div className="flex min-w-0 items-center gap-2">
            <Activity
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-finance)] opacity-80 sm:h-4 sm:w-4"
              strokeWidth={2}
              aria-hidden
            />
            <p className="m-0 min-w-0 flex-1 text-[10px] leading-snug text-orbita-secondary [overflow-wrap:anywhere] sm:text-[11px]">
            <span className="tabular-nums text-orbita-primary/75">{meta.transactionsInSelectedMonth ?? 0}</span> mov.
            {origenCorto ? (
              <>
                {" "}
                <span className="text-orbita-secondary/80">·</span> {origenCorto}
              </>
            ) : null}
            {meta.lastTransactionDate ? (
              <>
                {" "}
                <span className="text-orbita-secondary/80">·</span> últ. {formatLocalDateFullShortEsCo(meta.lastTransactionDate)}
                {updatedShort ? (
                  <>
                    {" "}
                    <span className="text-orbita-secondary/80">·</span>{" "}
                    <span className="whitespace-nowrap text-orbita-secondary/75">{updatedShort}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {" "}
                <span className="text-orbita-secondary/80">·</span> sin mov. este mes
              </>
            )}
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
