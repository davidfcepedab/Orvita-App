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
  {
    id: "caja",
    title: "1 · Continuidad y flujo de caja",
    layerIds: ["continuity_prev", "income", "expense_all", "net"],
  },
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

function layerVariant(id: string, amount: number): "default" | "muted" | "danger" | "success" {
  switch (id) {
    case "income":
      return "success"
    case "expense_all":
      return "danger"
    case "continuity_prev":
    case "net":
      return amount >= 0 ? "success" : "danger"
    case "modulo_structural":
      return "muted"
    case "gap_kpi_struct":
    case "unexplained":
      return Math.abs(amount) < 1 ? "muted" : "danger"
    case "bridges":
      return "default"
    default:
      return "default"
  }
}

function plRowShellClass(layerId: string, keyLine: boolean): string {
  const base = "border-b border-orbita-border/40 transition-colors"
  if (layerId === "continuity_prev") {
    return `${base} border-l-[3px] border-l-indigo-500/65 bg-indigo-500/[0.07] dark:bg-indigo-950/32`
  }
  if (layerId === "income") {
    return `${base} border-l-[3px] border-l-emerald-500/70 bg-emerald-500/[0.07] dark:bg-emerald-950/35`
  }
  if (layerId === "expense_all") {
    return `${base} border-l-[3px] border-l-rose-500/65 bg-rose-500/[0.06] dark:bg-rose-950/28`
  }
  if (layerId === "net") {
    return `${base} border-l-[3px] border-l-[color-mix(in_srgb,var(--color-accent-finance)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_11%,transparent)]`
  }
  if (layerId === "gap_kpi_struct" || layerId === "unexplained") {
    return `${base} border-l-[3px] border-l-amber-500/60 bg-amber-500/[0.06] dark:bg-amber-950/30`
  }
  if (layerId === "bridges") {
    return `${base} border-l-[3px] border-l-sky-500/55 bg-sky-500/[0.05] dark:bg-sky-950/28`
  }
  if (keyLine) {
    return `${base} bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,transparent)]`
  }
  return `${base} bg-orbita-surface-alt/[0.2]`
}

const SECTION_HEAD_CLASS: Record<string, string> = {
  caja: "border-l-[3px] border-l-emerald-600/55 bg-emerald-500/[0.08] dark:bg-emerald-950/40",
  operativo: "border-l-[3px] border-l-violet-500/50 bg-violet-500/[0.07] dark:bg-violet-950/35",
  cierre: "border-l-[3px] border-l-amber-500/55 bg-amber-500/[0.07] dark:bg-amber-950/32",
}

function KpiCard({
  label,
  value,
  sub,
  emphasize,
  dense,
}: {
  label: string
  value: ReactNode
  sub?: string
  emphasize?: boolean
  dense?: boolean
}) {
  return (
    <div
      className={[
        dense ? "rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5" : "rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5",
        emphasize
          ? "border-[color-mix(in_srgb,var(--color-accent-finance)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_9%,var(--color-surface))] shadow-[0_1px_0_color-mix(in_srgb,#fff_40%,transparent)]"
          : "border-orbita-border/75 bg-orbita-surface-alt/45",
      ].join(" ")}
    >
      <p
        className={[
          "font-semibold uppercase tracking-[0.12em] text-orbita-secondary",
          dense ? "text-[9px] leading-tight sm:text-[10px]" : "text-[10px]",
        ].join(" ")}
      >
        {label}
      </p>
      <div
        className={[
          "font-bold tabular-nums text-orbita-primary",
          dense ? "mt-1 text-sm sm:text-base" : "mt-1.5 text-base sm:text-lg",
        ].join(" ")}
      >
        {value}
      </div>
      {sub ? (
        <p className={["mt-1 leading-snug text-orbita-muted", dense ? "text-[9px] sm:text-[10px]" : "text-[10px]"].join(" ")}>
          {sub}
        </p>
      ) : null}
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
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px] text-orbita-secondary sm:text-xs">
            <span className="font-semibold uppercase tracking-[0.08em] text-orbita-muted">Arrastre</span>
            <MoneyCell
              value={c.previousMonthNetCashFlow}
              variant={c.previousMonthNetCashFlow >= 0 ? "success" : "danger"}
            />
            <span className="text-orbita-muted">mes previo (ingresos − gastos; no es saldo banco)</span>
          </p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-orbita-secondary sm:text-sm">
            El P&amp;L es <strong className="text-orbita-primary">continuo</strong>: primero el cierre en flujo del mes
            anterior, luego lo que ocurre en el mes seleccionado (caja → operativo → cierre). El detalle de{" "}
            <strong className="text-orbita-primary">Cuentas</strong>{" "}
            <Link href="/finanzas/cuentas" className="font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_80%,var(--color-text-primary))] underline-offset-2 hover:underline">
              está en su pestaña
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
          <p className="mt-0.5 text-xs text-orbita-muted">
            Leer de arriba a abajo. Dos columnas al mismo ancho. Índigo = arrastre mes anterior; verde = ingreso; rojo =
            egreso; ámbar = brechas; azul = puentes.
          </p>
        </div>

        <div className="border-b border-orbita-border/60 bg-orbita-surface-alt/25 px-4 py-3 sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbita-secondary">Indicadores del mes (resumen)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard dense label="Ingresos" value={<MoneyCell value={c.incomeTotal} variant="success" />} sub="Suma TX ingreso" />
            <KpiCard
              dense
              label="Gasto total"
              value={<MoneyCell value={c.expenseTotalAll} variant="danger" />}
              sub="Todos los egresos"
            />
            <KpiCard
              dense
              label="Flujo neto"
              value={<MoneyCell value={c.netCashFlow} variant={c.netCashFlow >= 0 ? "success" : "danger"} />}
              sub="Ingresos − gastos"
              emphasize
            />
            <KpiCard dense label="Gasto op. KPI" value={<MoneyCell value={c.expenseOperativoKpi} />} sub="Catálogo (operativo)" />
            <KpiCard
              dense
              label="Mapa operativo"
              value={<MoneyCell value={c.expenseStructuralOperativoUi} />}
              sub="Fijo + var. (sin módulo)"
            />
            <KpiCard
              dense
              label="Brecha sin explicar"
              value={<MoneyCell value={c.unexplainedKpiStructural} variant={Math.abs(c.unexplainedKpiStructural) < 1 ? "muted" : "danger"} />}
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

        <div className="overflow-x-auto">
          <table className="table-fixed w-full min-w-[min(100%,520px)] border-collapse text-left text-sm">
            <caption className="sr-only">
              Estado de resultados del mes: partidas en la primera columna, importes en COP en la segunda.
            </caption>
            <colgroup>
              <col style={{ width: "50%" }} />
              <col style={{ width: "50%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-orbita-border/60 bg-orbita-surface-alt/40 text-[11px] uppercase tracking-wide text-orbita-secondary">
                <th scope="col" className="w-1/2 px-4 py-2.5 font-semibold sm:px-5">
                  Partida
                </th>
                <th scope="col" className="w-1/2 px-4 py-2.5 text-right font-semibold tabular-nums sm:px-5">
                  COP
                </th>
              </tr>
            </thead>
            <tbody>
              {PL_GROUPS.map((g) => {
                const rows = layersForGroup(c.plLayers, g.layerIds)
                const headClass = SECTION_HEAD_CLASS[g.id] ?? "bg-orbita-surface-alt/50"
                return (
                  <Fragment key={g.id}>
                    <tr className={`border-b border-orbita-border/50 ${headClass}`}>
                      <td colSpan={2} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-orbita-primary sm:px-5">
                        {g.title}
                      </td>
                    </tr>
                    {rows.map((layer) => {
                      const keyLine =
                        layer.id === "continuity_prev" ||
                        layer.id === "net" ||
                        layer.id === "unexplained" ||
                        layer.id === "gap_kpi_struct"
                      const pad = layer.indent === 0 ? "pl-4 sm:pl-5" : layer.indent === 1 ? "pl-6 sm:pl-8" : "pl-8 sm:pl-12"
                      return (
                        <tr key={layer.id} className={plRowShellClass(layer.id, keyLine)}>
                          <td className={`min-w-0 py-2.5 pr-2 align-top ${pad}`}>
                            <span className={keyLine ? "font-semibold text-orbita-primary" : "text-orbita-secondary"}>
                              {layer.label}
                            </span>
                            {layer.hint ? (
                              <p className="mt-1 max-w-prose text-[10px] leading-snug text-orbita-muted sm:text-[11px]">
                                {layer.hint}
                              </p>
                            ) : null}
                          </td>
                          <td className={`min-w-0 py-2.5 px-4 text-right align-top tabular-nums sm:px-5 ${keyLine ? "font-semibold" : ""}`}>
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
