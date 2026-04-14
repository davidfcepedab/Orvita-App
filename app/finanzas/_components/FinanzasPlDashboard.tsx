"use client"

import { FormEvent, Fragment, type ReactNode, useMemo, useState } from "react"
import { ArrowDownRight, CheckCircle2, CircleAlert, Landmark, Printer, Trash2 } from "lucide-react"
import Link from "next/link"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { useLedgerAccounts } from "@/app/finanzas/useLedgerAccounts"
import { formatMoney } from "@/app/finanzas/cuentas/cuentasFormat"
import { Card } from "@/src/components/ui/Card"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import type { CanonicalPlLayer } from "@/lib/finanzas/canonicalMonthPl"
import { financeApiDelete, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { printMonthPlReport } from "@/lib/finanzas/printMonthPlReport"

function MoneyCell({
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

const PL_GROUPS: { id: string; title: string; layerIds: string[] }[] = [
  { id: "caja", title: "1 · Flujo de caja (movimientos del mes)", layerIds: ["income", "expense_all", "net"] },
  {
    id: "operativo",
    title: "2 · Operativo y mapa de categorías",
    layerIds: ["opex_kpi", "outside_kpi", "structural_ui", "modulo_structural", "gap_kpi_struct"],
  },
  { id: "cierre", title: "3 · Cierre y brecha", layerIds: ["bridges", "unexplained"] },
]

function layersForGroup(layers: CanonicalPlLayer[], ids: string[]) {
  const set = new Set(ids)
  return layers.filter((L) => set.has(L.id))
}

function layerVariant(id: string, amount: number): "default" | "danger" | "success" {
  if (id === "net") return amount >= 0 ? "success" : "danger"
  if (id === "expense_all") return "danger"
  return "default"
}

function KpiCard({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string
  value: ReactNode
  sub?: string
  emphasize?: boolean
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5",
        emphasize
          ? "border-[color-mix(in_srgb,var(--color-accent-finance)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_9%,var(--color-surface))] shadow-[0_1px_0_color-mix(in_srgb,#fff_40%,transparent)]"
          : "border-orbita-border/75 bg-orbita-surface-alt/45",
      ].join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{label}</p>
      <div className="mt-1.5 text-base font-bold tabular-nums text-orbita-primary sm:text-lg">{value}</div>
      {sub ? <p className="mt-1 text-[10px] leading-snug text-orbita-muted">{sub}</p> : null}
    </div>
  )
}

export function FinanzasPlDashboard() {
  const { financeMeta, financeMetaLoading, month, touchCapitalData } = useFinanceOrThrow()
  const c = financeMeta?.coherence
  const syncOn = isSupabaseEnabled()
  const { accounts: ledgerAccounts, loading: ledgerLoading } = useLedgerAccounts({ enabled: syncOn })

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [amountStr, setAmountStr] = useState("")
  const [label, setLabel] = useState("")
  const [bridgeKind, setBridgeKind] = useState<"kpi_structural" | "other">("kpi_structural")

  const residualOk = useMemo(() => (c ? Math.abs(c.checkResidual) < 1 : false), [c])
  const bridgeOk = useMemo(() => (c ? Math.abs(c.unexplainedKpiStructural) < 1 : false), [c])

  const monthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? ""
    const [y, m] = month.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }, [month])

  const showEmaHint = useMemo(() => {
    if (!c?.hintEmaAbsGap) return false
    return c.hintEmaAbsGap > 1
  }, [c?.hintEmaAbsGap])

  const ledgerSummary = useMemo(() => {
    if (!syncOn || ledgerAccounts.length === 0) return null
    const withManualDate = ledgerAccounts.filter(
      (a) => typeof a.manual_balance_on === "string" && a.manual_balance_on.length >= 8,
    ).length
    const automatic = Math.max(0, ledgerAccounts.length - withManualDate)
    return { total: ledgerAccounts.length, confirmadas: withManualDate, automaticas: automatic }
  }, [ledgerAccounts, syncOn])

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

  if (financeMetaLoading) {
    return (
      <div className="space-y-4 animate-pulse sm:space-y-5">
        <div className="h-32 rounded-2xl bg-orbita-surface-alt/80" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-24 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-24 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-24 rounded-xl bg-orbita-surface-alt/70" />
        </div>
        <div className="h-64 rounded-xl bg-orbita-surface-alt/60" />
      </div>
    )
  }

  if (!c && financeMeta) {
    return (
      <Card className="border-orbita-border/80 p-5 sm:p-6">
        <p className="text-base font-semibold text-orbita-primary">Sin P&amp;L para este periodo</p>
        <p className="mt-2 text-sm leading-relaxed text-orbita-secondary">
          {financeMeta.transactionsInSelectedMonth === 0
            ? "No hay movimientos en el mes seleccionado. Importa o registra transacciones para armar el estado de resultados."
            : "No se pudo calcular el desglose. Revisa la conexión o vuelve a intentar."}
        </p>
        <p className="mt-4 text-xs text-orbita-muted">
          Fuente KPI:{" "}
          {financeMeta.kpiSource === "transactions"
            ? "movimientos (automático)"
            : financeMeta.kpiSource === "snapshot"
              ? "snapshot almacenado"
              : "—"}
        </p>
      </Card>
    )
  }

  if (!c) {
    return (
      <Card className="border-dashed border-orbita-border p-5 text-sm text-orbita-secondary">
        Esperando datos del módulo Capital…
      </Card>
    )
  }

  const kpiSourceLabel =
    financeMeta?.kpiSource === "transactions"
      ? "Movimientos (automático)"
      : financeMeta?.kpiSource === "snapshot"
        ? "Snapshot mensual"
        : "Sin fuente"

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 border-b border-orbita-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orbita-secondary">Periodo</p>
          <h2 className="mt-0.5 text-xl font-bold capitalize tracking-tight text-orbita-primary sm:text-2xl">
            {monthLabel}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-orbita-secondary sm:text-sm">
            Lectura vertical como un estado de resultados: de arriba abajo, caja → operativo → cierre. Los importes de{" "}
            <strong className="text-orbita-primary">Cuentas</strong>{" "}
            <Link href="/finanzas/cuentas" className="font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_80%,var(--color-text-primary))] underline-offset-2 hover:underline">
              viven en su pestaña
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              residualOk ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/15 text-amber-900 dark:text-amber-100"
            }`}
          >
            {residualOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
            Identidad flujo {residualOk ? "OK" : "revisar"}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              bridgeOk ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-sky-500/15 text-sky-950 dark:text-sky-100"
            }`}
          >
            Brecha KPI {bridgeOk ? "cerrada" : "abierta"}
          </span>
          <button
            type="button"
            onClick={() => printMonthPlReport(monthLabel || month, c.plLayers)}
            className="inline-flex items-center gap-1.5 rounded-full border border-orbita-border bg-orbita-surface px-3 py-1.5 text-[11px] font-semibold text-orbita-primary shadow-sm transition hover:bg-orbita-surface-alt"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">KPI principales</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Ingresos" value={<MoneyCell value={c.incomeTotal} />} sub="Suma TX ingreso" />
          <KpiCard
            label="Gasto total"
            value={<MoneyCell value={c.expenseTotalAll} variant="danger" />}
            sub="Todos los egresos"
          />
          <KpiCard
            label="Flujo neto"
            value={<MoneyCell value={c.netCashFlow} variant={c.netCashFlow >= 0 ? "success" : "danger"} />}
            sub="Ingresos − gastos"
            emphasize
          />
          <KpiCard
            label="Gasto op. KPI"
            value={<MoneyCell value={c.expenseOperativoKpi} />}
            sub="Catálogo (operativo)"
          />
          <KpiCard
            label="Mapa operativo"
            value={<MoneyCell value={c.expenseStructuralOperativoUi} />}
            sub="Fijo + var. (sin módulo)"
          />
          <KpiCard
            label="Brecha sin explicar"
            value={<MoneyCell value={c.unexplainedKpiStructural} />}
            sub="Tras puentes"
            emphasize={Math.abs(c.unexplainedKpiStructural) >= 1}
          />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-orbita-muted">
          Fuente del KPI del resumen: <span className="font-medium text-orbita-secondary">{kpiSourceLabel}</span>
          {financeMeta?.transactionsInSelectedMonth != null ? (
            <>
              {" "}
              · <span className="font-medium text-orbita-secondary">{financeMeta.transactionsInSelectedMonth}</span> movimientos
              en el mes
            </>
          ) : null}
        </p>
      </div>

      {syncOn ? (
        <Card className="border-orbita-border/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))] text-orbita-primary">
              <Landmark className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-orbita-primary">Cuentas (ledger)</p>
              <p className="mt-0.5 text-xs leading-relaxed text-orbita-secondary">
                Confirmado = saldo con fecha de cierre manual en la cuenta. Automático = solo cálculo desde movimientos y
                reglas, sin ese cierre.
              </p>
              {ledgerLoading ? (
                <p className="mt-2 text-xs text-orbita-muted">Cargando cuentas…</p>
              ) : ledgerSummary ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:text-emerald-100">
                    Confirmadas: {ledgerSummary.confirmadas}
                  </span>
                  <span className="inline-flex rounded-full border border-orbita-border/80 bg-orbita-surface-alt px-2.5 py-1 text-[11px] font-medium text-orbita-secondary">
                    Automáticas: {ledgerSummary.automaticas}
                  </span>
                  <span className="inline-flex rounded-full border border-orbita-border/60 px-2.5 py-1 text-[11px] text-orbita-muted">
                    Total cuentas: {ledgerSummary.total}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-orbita-muted">Sin cuentas ledger listadas.</p>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {showEmaHint ? (
        <div
          className="flex gap-3 rounded-xl border border-sky-400/35 bg-sky-500/[0.08] p-4 text-sm dark:border-sky-500/30 dark:bg-sky-950/40"
          role="status"
        >
          <ArrowDownRight className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />
          <div>
            <p className="font-semibold text-orbita-primary dark:text-sky-50">Referencia histórica (EMA)</p>
            <p className="mt-1 text-orbita-secondary dark:text-sky-100/90">
              Brecha típica sin explicar:{" "}
              <span className="font-semibold tabular-nums">${formatMoney(c.hintEmaAbsGap ?? 0)}</span>. Este mes:{" "}
              <span className="font-semibold tabular-nums">${formatMoney(c.unexplainedKpiStructural)}</span>
            </p>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden border-orbita-border/85 shadow-[var(--shadow-card)]">
        <div className="border-b border-orbita-border/70 bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] px-4 py-3 sm:px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orbita-secondary">Estado de resultados</p>
          <p className="mt-0.5 text-xs text-orbita-muted">Leer de arriba a abajo. Montos en COP.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[min(100%,520px)] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-orbita-border/60 text-[11px] uppercase tracking-wide text-orbita-secondary">
                <th className="px-4 py-2.5 font-semibold sm:px-5">Partida</th>
                <th className="px-4 py-2.5 text-right font-semibold tabular-nums sm:px-5">COP</th>
              </tr>
            </thead>
            <tbody>
              {PL_GROUPS.map((g) => {
                const rows = layersForGroup(c.plLayers, g.layerIds)
                return (
                  <Fragment key={g.id}>
                    <tr className="bg-orbita-surface-alt/50">
                      <td colSpan={2} className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-orbita-primary sm:px-5">
                        {g.title}
                      </td>
                    </tr>
                    {rows.map((layer) => {
                      const keyLine = layer.id === "net" || layer.id === "unexplained" || layer.id === "gap_kpi_struct"
                      const pad = layer.indent === 0 ? "pl-4 sm:pl-5" : layer.indent === 1 ? "pl-6 sm:pl-8" : "pl-8 sm:pl-12"
                      return (
                        <tr
                          key={layer.id}
                          className={[
                            "border-b border-orbita-border/40",
                            keyLine ? "bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,transparent)]" : "",
                          ].join(" ")}
                        >
                          <td className={`py-2.5 pr-2 align-top ${pad}`}>
                            <span className={keyLine ? "font-semibold text-orbita-primary" : "text-orbita-secondary"}>
                              {layer.label}
                            </span>
                            {layer.hint ? (
                              <p className="mt-1 max-w-prose text-[10px] leading-snug text-orbita-muted sm:text-[11px]">
                                {layer.hint}
                              </p>
                            ) : null}
                          </td>
                          <td className={`py-2.5 px-4 text-right align-top tabular-nums sm:px-5 ${keyLine ? "font-semibold" : ""}`}>
                            <MoneyCell value={layer.amount} variant={layerVariant(layer.id, layer.amount)} />
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-orbita-border/80 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-orbita-primary">Puentes de conciliación</h3>
        <p className="mt-1 text-xs leading-relaxed text-orbita-secondary">
          Ajustes explícitos de la brecha KPI vs mapa. Opcional: el modelo usa el historial (EMA) como referencia.
        </p>

        {c.bridgeEntries.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {c.bridgeEntries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/35 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-orbita-primary">{e.label || "Puente"}</p>
                  <p className="text-[10px] text-orbita-muted">
                    {e.bridge_kind === "kpi_structural" ? "Brecha KPI vs mapa" : "Otro"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyCell value={e.amount_cop} />
                  {syncOn ? (
                    <button
                      type="button"
                      onClick={() => onDeleteBridge(e.id)}
                      className="rounded-lg p-1.5 text-orbita-muted hover:bg-orbita-surface hover:text-orbita-accent-danger"
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
          <p className="mt-3 text-sm text-orbita-muted">Sin puentes registrados en este mes.</p>
        )}

        {syncOn ? (
          <details className="group mt-5 rounded-xl border border-dashed border-orbita-border/75 bg-orbita-surface-alt/20">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-orbita-primary [&::-webkit-details-marker]:hidden">
              <span className="inline-flex w-full items-center justify-between gap-2">
                Registrar nuevo puente
                <span className="text-orbita-secondary transition group-open:rotate-90">›</span>
              </span>
            </summary>
            <form onSubmit={onSubmitBridge} className="space-y-3 border-t border-orbita-border/50 px-4 pb-4 pt-3">
              <p className="text-xs leading-relaxed text-orbita-secondary">
                Indica monto y etiqueta (p. ej. timing de nómina vs categoría). Tipo «Brecha KPI vs mapa» descuenta de la
                brecha pendiente.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium text-orbita-secondary">
                  Monto (COP)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="min-h-11 rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                    placeholder="250000"
                    autoComplete="off"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-orbita-secondary">
                  Tipo
                  <select
                    value={bridgeKind}
                    onChange={(e) => setBridgeKind(e.target.value as "kpi_structural" | "other")}
                    className="min-h-11 rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                  >
                    <option value="kpi_structural">Brecha KPI vs mapa</option>
                    <option value="other">Otro</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5 text-xs font-medium text-orbita-secondary">
                Etiqueta
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="min-h-11 rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                  placeholder="Ej. Timing nómina vs categoría"
                />
              </label>
              {formError ? <p className="text-sm text-orbita-accent-danger">{formError}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 rounded-lg bg-orbita-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Guardando…" : "Guardar puente"}
              </button>
            </form>
          </details>
        ) : (
          <p className="mt-3 text-xs text-orbita-muted">Activa Supabase para guardar puentes.</p>
        )}
      </Card>
    </div>
  )
}
