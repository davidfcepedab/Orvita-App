"use client"

import { Card } from "@/src/components/ui/Card"
import type { FinanceModuleMeta } from "@/lib/finanzas/financeModuleMeta"
import { useFinance } from "./FinanceContext"

function formatYmLongEs(ym: string) {
  const [ys, ms] = ym.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  return new Date(y, m - 1, 15).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

function formatDayEs(isoDay: string) {
  if (isoDay.length < 10) return isoDay
  const d = new Date(`${isoDay.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? isoDay
    : d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value || 0))
}

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

export function FinanceDataLineBanner() {
  const finance = useFinance()
  if (!finance || !supabaseEnabled) return null

  const { month, setMonth, financeMeta, financeMetaLoading, financeMetaNotice } = finance

  if (financeMetaLoading && !financeMeta) {
    return (
      <Card className="min-w-0 border border-orbita-border/80 bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
          Línea de datos
        </p>
        <p className="mt-1.5 text-xs text-orbita-secondary">Cargando trazabilidad del periodo…</p>
      </Card>
    )
  }

  const meta = financeMeta as FinanceModuleMeta | null
  if (!meta) return null

  const kpiSourceLabel =
    meta.kpiSource === "transactions"
      ? "Movimientos del mes"
      : meta.kpiSource === "snapshot"
        ? "Resumen almacenado (snapshot)"
        : "Sin fuente numérica"

  const kpiHasSignal = meta.kpiHasSignal

  return (
    <div className="min-w-0 space-y-3">
      {financeMetaNotice ? (
        <p className="rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-xs leading-snug text-orbita-secondary">
          {financeMetaNotice}
        </p>
      ) : null}

      <Card className="min-w-0 border border-orbita-border/80 bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
          Línea de datos
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-orbita-primary">
          <span className="font-medium">Periodo:</span> {formatYmLongEs(month)} ·{" "}
          <span className="font-medium">Movimientos en el mes:</span> {meta.transactionsInSelectedMonth ?? 0} ·{" "}
          <span className="font-medium">KPI:</span> {kpiSourceLabel}
        </p>
        {meta.lastTransactionDate ? (
          <p className="mt-1 text-xs text-orbita-secondary">
            <span className="font-medium text-orbita-primary">Último movimiento en base:</span>{" "}
            {formatDayEs(meta.lastTransactionDate)}
            {meta.lastTransactionUpdatedAt
              ? ` · registro actualizado ${new Date(meta.lastTransactionUpdatedAt).toLocaleString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : null}
          </p>
        ) : (
          <p className="mt-1 text-xs text-orbita-secondary">
            Aún no hay movimientos financieros en la base para tu hogar.
          </p>
        )}
      </Card>

      {!kpiHasSignal && meta.reference ? (
        <Card className="min-w-0 border border-dashed border-[color-mix(in_srgb,var(--color-accent-finance)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,var(--color-surface))] p-4 sm:p-5">
          <p className="text-sm font-semibold text-orbita-primary">
            Sin cifras para {formatYmLongEs(month)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-orbita-secondary">
            No mostramos &quot;0&quot; como si fuera un cierre real. Este es el{" "}
            <span className="font-medium text-orbita-primary">último mes con resumen guardado</span> en el sistema:
          </p>
          <div className="mt-3 grid gap-2 rounded-xl border border-orbita-border bg-orbita-surface px-3 py-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-orbita-secondary">Mes</p>
              <p className="font-medium text-orbita-primary">{formatYmLongEs(meta.reference.month)}</p>
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
            className="mt-3 min-h-[44px] w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-orbita-primary transition hover:bg-orbita-surface-alt sm:w-auto"
          >
            Abrir {meta.reference.month} en el periodo
          </button>
        </Card>
      ) : null}
    </div>
  )
}
