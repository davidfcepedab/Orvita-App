"use client"

import { FormEvent, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Printer, Trash2 } from "lucide-react"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { formatMoney } from "@/app/finanzas/cuentas/cuentasFormat"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiDelete, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { printMonthPlReport } from "@/lib/finanzas/printMonthPlReport"

function Money({
  value,
  variant = "default",
}: {
  value: number
  variant?: "default" | "muted" | "danger" | "success"
}) {
  const abs = Math.abs(value)
  const tone =
    variant === "muted"
      ? "text-orbita-muted"
      : variant === "danger"
        ? "text-orbita-accent-danger"
        : variant === "success"
          ? "text-orbita-accent-success"
          : abs < 1
            ? "text-orbita-muted"
            : "text-orbita-primary"
  return <span className={`tabular-nums font-semibold ${tone}`}>${formatMoney(value)}</span>
}

export function FinanzasCoherencePanel() {
  const { financeMeta, financeMetaLoading, month, touchCapitalData } = useFinanceOrThrow()
  const c = financeMeta?.coherence
  const [plOpen, setPlOpen] = useState(true)
  const [bridgesOpen, setBridgesOpen] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [amountStr, setAmountStr] = useState("")
  const [label, setLabel] = useState("")
  const [bridgeKind, setBridgeKind] = useState<"kpi_structural" | "other">("kpi_structural")

  const syncOn = isSupabaseEnabled()

  const residualOk = useMemo(() => (c ? Math.abs(c.checkResidual) < 1 : false), [c])
  const bridgeOk = useMemo(() => (c ? Math.abs(c.unexplainedKpiStructural) < 1 : false), [c])

  const monthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? ""
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }, [month])

  const showEmaHint = useMemo(() => {
    if (!c?.hintEmaAbsGap) return false
    return c.hintEmaAbsGap > 1
  }, [c?.hintEmaAbsGap])

  if (financeMetaLoading) {
    return (
      <div
        className="animate-pulse rounded-[var(--radius-card)] border border-orbita-border/70 bg-orbita-surface-alt/40 p-3 sm:p-4"
        aria-busy="true"
        aria-label="Cargando conciliación del mes"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orbita-muted sm:text-[13px]">
          P&amp;L del mes · conciliación
        </p>
        <p className="mt-2 text-[11px] text-orbita-secondary">Cargando…</p>
      </div>
    )
  }

  if (!c && financeMeta) {
    return (
      <div
        className="rounded-[var(--radius-card)] border border-orbita-border/70 bg-orbita-surface-alt/40 p-3 sm:p-4"
        role="region"
        aria-label="Estado de resultados y conciliación del mes"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orbita-muted sm:text-[13px]">
          P&amp;L del mes · conciliación
        </p>
        <p className="mt-1 text-[11px] leading-snug text-orbita-secondary sm:text-xs">
          {financeMeta.transactionsInSelectedMonth === 0
            ? "No hay movimientos en el mes seleccionado. Registra o importa transacciones para ver el desglose y la conciliación."
            : "No hay datos de P&amp;L para este periodo."}
        </p>
      </div>
    )
  }

  if (!c) return null

  async function onSubmitBridge(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const raw = amountStr.replace(/\./g, "").replace(/[^\d-]/g, "")
    const amount = Number(raw)
    if (!Number.isFinite(amount)) {
      setFormError("Indica un monto numérico (COP).")
      return
    }
    setSubmitting(true)
    try {
      const res = await financeApiJson("/api/orbita/finanzas/month-bridge", {
        method: "POST",
        body: {
          month,
          bridge_kind: bridgeKind,
          amount_cop: amount,
          label: label.trim() || "Puente",
        },
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo guardar")
      }
      setAmountStr("")
      setLabel("")
      touchCapitalData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error")
    } finally {
      setSubmitting(false)
    }
  }

  async function onDeleteBridge(id: string) {
    setFormError(null)
    try {
      const res = await financeApiDelete(`/api/orbita/finanzas/month-bridge?id=${encodeURIComponent(id)}`)
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo eliminar")
      }
      touchCapitalData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div
      className="rounded-[var(--radius-card)] border border-orbita-border/70 bg-orbita-surface-alt/40 p-3 sm:p-4"
      role="region"
      aria-label="Estado de resultados y conciliación del mes"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-orbita-muted sm:text-[13px]">
          P&amp;L del mes · conciliación
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
              residualOk ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
            }`}
          >
            Flujo {residualOk ? "cuadrado" : "revisar"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
              bridgeOk ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-sky-500/15 text-sky-900 dark:text-sky-200"
            }`}
          >
            KPI vs mapa {bridgeOk ? "explicado" : "pendiente"}
          </span>
          <button
            type="button"
            onClick={() => printMonthPlReport(monthLabel || month, c.plLayers)}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-orbita-border/80 bg-orbita-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orbita-primary transition hover:bg-orbita-surface-alt sm:text-xs"
            title="Abre impresión del navegador; puedes guardar como PDF"
          >
            <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-orbita-muted sm:text-xs">
        Lectura en capas: primero flujo de caja desde movimientos; luego KPI operativo y mapa fijo/variable (misma
        tubería que Categorías); los puentes reducen la brecha restante. Cuentas = saldos y ledger, no esta cadena.
      </p>

      {showEmaHint ? (
        <div
          className="mt-3 rounded-lg border border-sky-400/35 bg-sky-500/[0.09] px-3 py-2.5 text-[11px] leading-snug text-sky-950 dark:border-sky-500/25 dark:bg-sky-950/35 dark:text-sky-100"
          role="status"
        >
          <p className="font-semibold text-orbita-primary dark:text-sky-50">Brecha típica (referencia aprendida)</p>
          <p className="mt-1 text-orbita-secondary dark:text-sky-200/95">
            Con tus cierres anteriores, lo que suele quedar sin explicar entre KPI y mapa ronda{" "}
            <span className="font-semibold tabular-nums text-orbita-primary dark:text-sky-50">
              ${formatMoney(c.hintEmaAbsGap ?? 0)} COP
            </span>
            . Este mes la brecha restante es{" "}
            <span className="font-semibold tabular-nums text-orbita-primary dark:text-sky-50">
              ${formatMoney(c.unexplainedKpiStructural)} COP
            </span>
            {Math.abs(c.unexplainedKpiStructural) < 1 ? " (alineado)." : "."}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPlOpen((v) => !v)}
        className="mt-3 flex w-full items-center gap-2 text-left text-xs font-semibold text-orbita-primary sm:text-sm"
        aria-expanded={plOpen}
      >
        {plOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        Ver capas (tipo P&amp;L)
      </button>

      {plOpen ? (
        <ul className="mt-2 space-y-1.5 border-t border-orbita-border/50 pt-3">
          {c.plLayers.map((layer) => (
            <li
              key={layer.id}
              className={`text-xs sm:text-sm ${layer.indent === 1 ? "pl-3 sm:pl-4" : layer.indent === 2 ? "pl-6 sm:pl-8" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-orbita-muted">{layer.label}</span>
                <Money
                  value={layer.amount}
                  variant={
                    layer.id === "net"
                      ? layer.amount >= 0
                        ? "success"
                        : "danger"
                      : layer.id === "expense_all"
                        ? "danger"
                        : "default"
                  }
                />
              </div>
              {layer.hint ? (
                <p className="mt-0.5 text-[10px] leading-snug text-orbita-muted/90 sm:text-[11px]">{layer.hint}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => setBridgesOpen((v) => !v)}
        className="mt-4 flex w-full items-center gap-2 text-left text-xs font-semibold text-orbita-primary sm:text-sm"
        aria-expanded={bridgesOpen}
      >
        {bridgesOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        Puentes y aprendizaje
      </button>

      {bridgesOpen ? (
        <div className="mt-2 space-y-3 border-t border-orbita-border/50 pt-3">
          {c.bridgeEntries.length > 0 ? (
            <ul className="space-y-2">
              {c.bridgeEntries.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orbita-border/50 bg-orbita-surface/60 px-2 py-1.5 text-xs sm:text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-orbita-primary">{e.label || "Puente"}</p>
                    <p className="text-[10px] text-orbita-muted">
                      {e.bridge_kind === "kpi_structural" ? "Explica brecha KPI vs mapa" : "Otro"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Money value={e.amount_cop} />
                    {syncOn ? (
                      <button
                        type="button"
                        onClick={() => onDeleteBridge(e.id)}
                        className="rounded-md p-1 text-orbita-muted hover:bg-orbita-surface-alt hover:text-orbita-accent-danger"
                        aria-label="Eliminar puente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-orbita-muted sm:text-xs">Aún no hay puentes registrados para este mes.</p>
          )}

          {syncOn ? (
            <form onSubmit={onSubmitBridge} className="space-y-2 rounded-lg border border-dashed border-orbita-border/70 p-3">
              <p className="text-[11px] font-medium text-orbita-secondary sm:text-xs">
                Registrar cuánto de la brecha KPI vs mapa explicas (timing, reclasificación, etc.). El modelo guarda un
                promedio móvil de lo que queda sin explicar para orientar el siguiente mes.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-[11px] text-orbita-secondary">
                  Monto (COP)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-1.5 text-sm text-orbita-primary"
                    placeholder="Ej. 250000"
                    autoComplete="off"
                  />
                </label>
                <label className="grid gap-1 text-[11px] text-orbita-secondary">
                  Tipo
                  <select
                    value={bridgeKind}
                    onChange={(e) => setBridgeKind(e.target.value as "kpi_structural" | "other")}
                    className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-1.5 text-sm text-orbita-primary"
                  >
                    <option value="kpi_structural">Brecha KPI vs mapa operativo</option>
                    <option value="other">Otro (no resta de la brecha KPI)</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-[11px] text-orbita-secondary">
                Etiqueta
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-1.5 text-sm text-orbita-primary"
                  placeholder="Ej. Timing nómina vs categoría"
                />
              </label>
              {formError ? <p className="text-xs text-orbita-accent-danger">{formError}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-orbita-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Guardando…" : "Guardar puente"}
              </button>
            </form>
          ) : (
            <p className="text-[11px] text-orbita-muted sm:text-xs">Conecta Supabase para persistir puentes y EMA.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
