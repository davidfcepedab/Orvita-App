"use client"

import { FormEvent, Fragment, useMemo, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Landmark,
  Printer,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { useLedgerAccounts } from "@/app/finanzas/useLedgerAccounts"
import { formatMoney } from "@/app/finanzas/cuentas/cuentasFormat"
import { Card } from "@/src/components/ui/Card"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import type { CanonicalPlLayer } from "@/lib/finanzas/canonicalMonthPl"
import type { MonthFinanceCoherence } from "@/lib/finanzas/monthFinanceCoherence"
import { financeApiDelete, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { printMonthPlReport } from "@/lib/finanzas/printMonthPlReport"
import { FINANCE_PL_README_EXPANDED } from "@/lib/finanzas/financeModuleCopy"
import { financePlStackClass } from "@/app/finanzas/_components/financeChrome"
import { formatYmLongMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { cn } from "@/lib/utils"

/** Texto corto para el chip en vista estrecha (evita competir con el título de sección). */
function plKpiSourceShortLabel(source: "transactions" | "snapshot" | "empty" | null | undefined): string {
  if (source === "transactions") return "Movs · auto"
  if (source === "snapshot") return "Snapshot"
  return "Sin fuente"
}

/** Misma piel que ConfigConnectionPill: estado según fuente KPI del mes. */
function PlKpiSourcePill({
  source,
  label,
  className,
}: {
  source: "transactions" | "snapshot" | "empty" | null | undefined
  label: string
  className?: string
}) {
  const short = plKpiSourceShortLabel(source)
  const base =
    "inline-flex min-w-0 max-w-full shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none text-center sm:min-w-[6.75rem] sm:px-2.5 sm:py-1 sm:text-[11px] sm:max-w-[min(100%,22rem)]"
  const text = (
    <>
      <span className="min-w-0 whitespace-nowrap sm:hidden">{short}</span>
      <span className="hidden min-w-0 [overflow-wrap:anywhere] sm:inline">{label}</span>
    </>
  )
  if (source === "transactions") {
    return (
      <span
        className={cn(base, className)}
        style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "rgb(4, 120, 87)" }}
        title={label}
        aria-label={label}
      >
        <Check className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={2.5} aria-hidden />
        {text}
      </span>
    )
  }
  if (source === "snapshot") {
    return (
      <span
        className={cn(base, className)}
        style={{ backgroundColor: "rgba(251, 191, 36, 0.2)", color: "rgb(180, 83, 9)" }}
        title={label}
        aria-label={label}
      >
        {text}
      </span>
    )
  }
  return (
    <span
      className={cn(base, className)}
      style={{ backgroundColor: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" }}
      title={label}
      aria-label={label}
    >
      {text}
    </span>
  )
}

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
  return (
    <span className={cn("tabular-nums text-[10px] font-semibold leading-snug sm:text-[11px]", tone)}>
      ${formatMoney(value)}
    </span>
  )
}

const PL_GROUPS: {
  id: string
  title: string
  subtitle?: string
  layerIds: string[]
  /** Si true, el bloque va dentro de <details> cerrado por defecto (conciliación KPI↔mapa). */
  collapsed?: boolean
}[] = [
  {
    id: "caja",
    title: "Caja del mes",
    subtitle: "Continuidad, ingresos, egresos y flujo neto.",
    layerIds: ["continuity_prev", "income", "expense_all", "net"],
  },
  {
    id: "operativo",
    title: "Operación del hogar",
    subtitle: "Catálogo operativo, fuera de KPI y total en mapa (fijo + variable, sin módulo financiero).",
    layerIds: ["opex_kpi", "outside_kpi", "structural_ui"],
  },
  {
    id: "financiero",
    title: "Capa financiera (mapa)",
    subtitle: "Bloque estructural aparte del total operativo de categorías.",
    layerIds: ["modulo_structural"],
  },
  {
    id: "cierre",
    title: "Conciliación KPI ↔ mapa",
    subtitle: "Brechas, puentes y pendiente; pliega si solo quieres ver el resultado del mes arriba.",
    layerIds: ["gap_kpi_struct", "bridges", "unexplained"],
    collapsed: true,
  },
]

function layersForGroup(layers: CanonicalPlLayer[], ids: string[]) {
  const set = new Set(ids)
  return layers.filter((L) => set.has(L.id))
}

function PlLayerRows({ layers }: { layers: CanonicalPlLayer[] }) {
  return (
    <>
      {layers.map((layer) => {
        const keyLine =
          layer.id === "continuity_prev" ||
          layer.id === "net" ||
          layer.id === "unexplained" ||
          layer.id === "gap_kpi_struct"
        const pad = layer.indent === 0 ? "pl-4 sm:pl-5" : layer.indent === 1 ? "pl-6 sm:pl-8" : "pl-8 sm:pl-12"
        return (
          <tr key={layer.id} className={plRowShellClass(layer.id, keyLine)}>
            <td className={`min-w-0 py-2 pr-2 align-top ${pad}`}>
              <span
                className={cn(
                  "text-[10px] leading-snug [overflow-wrap:anywhere]",
                  keyLine ? "font-semibold text-orbita-primary" : "font-normal text-orbita-secondary",
                  layer.hint &&
                    "cursor-help border-b border-dotted border-orbita-border/70 decoration-orbita-border/60",
                )}
                title={layer.hint}
              >
                {layer.label}
              </span>
            </td>
            <td className={`min-w-0 py-2 px-4 text-right align-top tabular-nums sm:px-5 ${keyLine ? "font-semibold" : ""}`}>
              <MoneyCell value={layer.amount} variant={layerVariant(layer.id, layer.amount)} />
            </td>
          </tr>
        )
      })}
    </>
  )
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
    return `${base} border-t-[3px] border-t-sky-600/70 bg-sky-500/[0.09] dark:bg-sky-950/38`
  }
  if (layerId === "income") {
    return `${base} border-t-[3px] border-t-emerald-500/70 bg-emerald-500/[0.07] dark:bg-emerald-950/35`
  }
  if (layerId === "expense_all") {
    return `${base} border-t-[3px] border-t-rose-500/65 bg-rose-500/[0.06] dark:bg-rose-950/28`
  }
  if (layerId === "net") {
    return `${base} border-t-[3px] border-t-[color-mix(in_srgb,var(--color-accent-finance)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_11%,transparent)]`
  }
  if (layerId === "gap_kpi_struct" || layerId === "unexplained") {
    return `${base} border-t-[3px] border-t-amber-500/60 bg-amber-500/[0.06] dark:bg-amber-950/30`
  }
  if (layerId === "bridges") {
    return `${base} border-t-[3px] border-t-sky-500/55 bg-sky-500/[0.05] dark:bg-sky-950/28`
  }
  if (keyLine) {
    return `${base} bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,transparent)]`
  }
  return `${base} bg-orbita-surface-alt/[0.2]`
}

/** Cabeceras de bloque: neutras; el significado lo dan número + título (el color queda en filas clave). */
const PL_SECTION_HEAD_NEUTRAL =
  "border-t border-orbita-border/65 bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] dark:bg-orbita-surface-alt/22"

const SECTION_HEAD_CLASS: Record<string, string> = {
  caja: PL_SECTION_HEAD_NEUTRAL,
  operativo: PL_SECTION_HEAD_NEUTRAL,
  financiero: PL_SECTION_HEAD_NEUTRAL,
  /** Conciliación: ligera señal ámbar (bloque analítico / revisión). */
  cierre: "border-t-[3px] border-t-amber-500/55 bg-amber-500/[0.07] dark:bg-amber-950/32",
}

/** Desplegables auxiliares bajo el encabezado del P&amp;L (misma piel). */
const PL_AUX_DISCLOSURE_SUMMARY =
  "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] font-semibold text-orbita-primary sm:px-5 [&::-webkit-details-marker]:hidden"

function plLayerAmount(layers: CanonicalPlLayer[], id: string): number {
  return layers.find((L) => L.id === id)?.amount ?? 0
}

/** Variación del flujo neto respecto al flujo neto del mes calendario anterior (mismo criterio que la fila de continuidad). */
function netMonthOverMonth(c: MonthFinanceCoherence): { delta: number; pct: number | null } {
  const current = c.netCashFlow
  const prior = c.previousMonthNetCashFlow
  const delta = current - prior
  if (!Number.isFinite(prior) || Math.abs(prior) < 1) {
    return { delta, pct: null }
  }
  return { delta, pct: (delta / Math.abs(prior)) * 100 }
}

export function FinanzasPlDashboard({ omitStrategicHero = false }: { omitStrategicHero?: boolean } = {}) {
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
    return formatYmLongMonthYearEsCo(month)
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

  const netMom = useMemo(() => (c ? netMonthOverMonth(c) : { delta: 0, pct: null as number | null }), [c])

  const strategic = useMemo(() => {
    if (!c) {
      return {
        income: 0,
        expense: 0,
        opexKpi: 0,
        gap: 0,
        unexplained: 0,
        modulo: 0,
      }
    }
    const layers = c.plLayers
    return {
      income: plLayerAmount(layers, "income"),
      expense: Math.abs(plLayerAmount(layers, "expense_all")),
      opexKpi: plLayerAmount(layers, "opex_kpi"),
      gap: plLayerAmount(layers, "gap_kpi_struct"),
      unexplained: plLayerAmount(layers, "unexplained"),
      modulo: plLayerAmount(layers, "modulo_structural"),
    }
  }, [c])

  const recommendedActions = useMemo(() => {
    if (!c) return []
    const items: { id: string; title: string; href?: string; hash?: string }[] = []
    if (Math.abs(c.unexplainedKpiStructural) >= 1) {
      items.push({
        id: "reconcile",
        title: `Brecha sin explicar ${formatMoney(Math.abs(c.unexplainedKpiStructural))} COP — revisa conciliación o puentes`,
        hash: "#pl-puentes-card",
      })
    }
    if (!residualOk) {
      items.push({
        id: "identity",
        title: "Cuadre de movimientos: revisa importes en Movimientos (identidad contable)",
        href: "/finanzas/transactions",
      })
    }
    if (Math.abs(c.gapKpiVsStructuralUi) >= 50_000) {
      items.push({
        id: "gap",
        title: "Brecha KPI vs mapa operativo elevada — contrasta con Categorías",
        href: "/finanzas/categories",
      })
    }
    if (items.length === 0) {
      items.push({
        id: "ok",
        title: "Sin alertas críticas este mes. Puedes profundizar en partidas abajo o en Perspectivas.",
        href: "/finanzas/insights",
      })
    }
    return items.slice(0, 4)
  }, [c, residualOk])

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
        ? financeMeta?.kpiIncomeBasis === "operativo_snapshot"
          ? "Snapshot mensual (ingreso operativo)"
          : financeMeta?.kpiIncomeBasis === "extracto_snapshot"
            ? "Snapshot mensual (ingreso extracto)"
            : "Snapshot mensual"
        : "Sin fuente"

  const plMainGroups = PL_GROUPS.filter((g) => !g.collapsed)
  const plConciliationGroup = PL_GROUPS.find((g) => g.collapsed)

  return (
    <div className={cn("space-y-3 sm:space-y-4", financePlStackClass)}>
      {!omitStrategicHero ? (
      <section
        className="overflow-hidden rounded-2xl border border-orbita-border/85 bg-orbita-surface shadow-[var(--shadow-card)]"
        aria-label="P&L del periodo y ayudas"
      >
        <div className="border-b border-orbita-border/50 bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,var(--color-surface))] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orbita-secondary">Mes analizado</p>
              <h2 className="mt-1 text-xl font-bold capitalize tracking-tight text-orbita-primary sm:text-2xl">{monthLabel}</h2>
              <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                Resultado y presiones usan los mismos datos que la tabla de partidas y{" "}
                <Link
                  href="/finanzas/cuentas"
                  className="font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_78%,var(--color-text-primary))] underline-offset-2 hover:underline"
                >
                  Cuentas
                </Link>{" "}
                (saldos bancarios aparte).
              </p>
              <div className="mt-4 rounded-2xl border border-orbita-border/50 bg-orbita-surface/90 px-4 py-4 shadow-sm sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Flujo neto del mes</p>
                <p
                  className={`mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
                    c.netCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                  }`}
                >
                  ${formatMoney(c.netCashFlow)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-orbita-secondary">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    {netMom.delta >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden />
                    )}
                    <span className="font-medium text-orbita-primary">
                      {netMom.delta >= 0 ? "+" : "−"}
                      ${formatMoney(Math.abs(netMom.delta))}
                    </span>
                    <span>vs mes anterior (flujo neto)</span>
                  </span>
                  {netMom.pct != null && Number.isFinite(netMom.pct) ? (
                    <span className="tabular-nums text-orbita-muted">
                      ({netMom.delta >= 0 ? "+" : ""}
                      {netMom.pct.toFixed(1)}%)
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[10px] text-orbita-muted">
                  Mes anterior (continuidad): ${formatMoney(c.previousMonthNetCashFlow)} · Fuente KPI: {kpiSourceLabel}
                  {financeMeta?.transactionsInSelectedMonth != null ? (
                    <> · {financeMeta.transactionsInSelectedMonth} movimientos en el mes</>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:max-w-md lg:flex-col">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    residualOk
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                      : "bg-amber-500/15 text-amber-900 dark:text-amber-100"
                  }`}
                >
                  {residualOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                  Identidad {residualOk ? "OK" : "revisar"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    bridgeOk
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                      : "bg-sky-500/15 text-sky-950 dark:text-sky-100"
                  }`}
                >
                  Brecha {bridgeOk ? "cerrada" : "abierta"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => printMonthPlReport(monthLabel || month, c.plLayers)}
                className="inline-flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-orbita-border/90 bg-orbita-surface px-3 py-2 text-[11px] font-semibold text-orbita-primary shadow-sm transition hover:bg-orbita-surface-alt sm:w-auto"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {(
              [
                { label: "Ingresos", value: strategic.income, tone: "text-emerald-700 dark:text-emerald-300" },
                { label: "Gastos (total)", value: -strategic.expense, tone: "text-rose-700 dark:text-rose-300" },
                { label: "Gasto operativo KPI", value: strategic.opexKpi, tone: "text-orbita-primary" },
                {
                  label: "Brecha sin explicar",
                  value: strategic.unexplained,
                  tone:
                    Math.abs(strategic.unexplained) < 1
                      ? "text-orbita-muted"
                      : "text-amber-800 dark:text-amber-200",
                },
              ] as const
            ).map((cell) => (
              <div
                key={cell.label}
                className="rounded-xl border border-orbita-border/45 bg-orbita-surface/80 px-3 py-2.5 shadow-sm"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{cell.label}</p>
                <p className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${cell.tone}`}>${formatMoney(cell.value)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-3 dark:border-rose-900/50 dark:bg-rose-950/25">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-900 dark:text-rose-100">Presión: gasto operativo</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-orbita-primary">${formatMoney(strategic.opexKpi)}</p>
              <p className="mt-1 text-[10px] leading-snug text-orbita-secondary">Catálogo KPI · mismo criterio que partidas</p>
              <Link
                href="/finanzas/categories"
                className="mt-2 inline-block text-[10px] font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_85%,var(--color-text-primary))] underline-offset-2 hover:underline"
              >
                Ver categorías
              </Link>
            </div>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/55 px-3 py-3 dark:border-amber-900/45 dark:bg-amber-950/25">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-950 dark:text-amber-100">Presión: brecha KPI ↔ mapa</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-orbita-primary">${formatMoney(strategic.gap)}</p>
              <p className="mt-1 text-[10px] leading-snug text-orbita-secondary">gap_kpi_struct en partidas</p>
              <a
                href="#pl-partidas-table"
                className="mt-2 inline-block text-[10px] font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_85%,var(--color-text-primary))] underline-offset-2 hover:underline"
              >
                Ir a partidas
              </a>
            </div>
            <div className="rounded-xl border border-violet-200/75 bg-violet-50/50 px-3 py-3 dark:border-violet-900/45 dark:bg-violet-950/25">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-900 dark:text-violet-100">Capa financiera (mapa)</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-orbita-primary">${formatMoney(strategic.modulo)}</p>
              <p className="mt-1 text-[10px] leading-snug text-orbita-secondary">Módulo estructural del mapa</p>
              <Link
                href="/finanzas/categories"
                className="mt-2 inline-block text-[10px] font-semibold text-[color-mix(in_srgb,var(--color-accent-finance)_85%,var(--color-text-primary))] underline-offset-2 hover:underline"
              >
                Ver mapa en categorías
              </Link>
            </div>
          </div>

          {recommendedActions.length > 0 ? (
            <div className="mt-5 rounded-xl border border-orbita-border/50 bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,transparent)] px-3 py-3 sm:px-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">Siguientes pasos (datos del mes)</p>
              <ul className="mt-2 space-y-2 text-[11px] leading-snug text-orbita-secondary">
                {recommendedActions.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_55%,var(--color-border))]" aria-hidden />
                    <span>
                      {a.href ? (
                        <Link href={a.href} className="font-medium text-orbita-primary underline-offset-2 hover:underline">
                          {a.title}
                        </Link>
                      ) : a.hash ? (
                        <a href={a.hash} className="font-medium text-orbita-primary underline-offset-2 hover:underline">
                          {a.title}
                        </a>
                      ) : (
                        a.title
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="bg-orbita-surface-alt/25">
          <details className="group border-b border-orbita-border/45 last:border-b-0">
            <summary className={PL_AUX_DISCLOSURE_SUMMARY}>
              <span>Cómo leer este P&amp;L</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-orbita-secondary transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-2 border-t border-orbita-border/40 bg-orbita-surface/80 px-4 pb-3 pt-2 text-[11px] leading-relaxed text-orbita-secondary sm:px-5">
              <p className="m-0">{FINANCE_PL_README_EXPANDED}</p>
            </div>
          </details>
          {syncOn ? (
            <details className="group border-b border-orbita-border/45 last:border-b-0">
              <summary className={PL_AUX_DISCLOSURE_SUMMARY}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))] text-orbita-primary sm:h-9 sm:w-9">
                    <Landmark className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-orbita-primary">Tus cuentas importadas</span>
                    <span className="block text-[10px] font-normal text-orbita-muted">Cierre manual con fecha frente a solo movimientos</span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-orbita-secondary transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-orbita-border/40 bg-orbita-surface/80 px-4 pb-3 pt-2 sm:px-5">
                <p className="text-xs leading-relaxed text-orbita-secondary">
                  Confirmado = cierre manual con fecha en la cuenta. Automático = solo movimientos y reglas, sin ese ancla.
                </p>
                {ledgerLoading ? (
                  <p className="mt-3 text-xs text-orbita-muted">Cargando cuentas…</p>
                ) : ledgerSummary ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:text-emerald-100">
                      Confirmadas: {ledgerSummary.confirmadas}
                    </span>
                    <span className="inline-flex rounded-full border border-orbita-border/80 bg-orbita-surface-alt px-2.5 py-1 text-[11px] font-medium text-orbita-secondary">
                      Automáticas: {ledgerSummary.automaticas}
                    </span>
                    <span className="inline-flex rounded-full border border-orbita-border/60 px-2.5 py-1 text-[11px] text-orbita-muted">
                      Total: {ledgerSummary.total}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-orbita-muted">Sin cuentas ledger listadas.</p>
                )}
              </div>
            </details>
          ) : null}
        </div>
      </section>
      ) : null}

      <Card
        id="pl-partidas-table"
        className="overflow-hidden border-orbita-border/80 bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
        aria-labelledby="pl-partidas-heading"
      >
        <div className="border-b border-orbita-border/55 bg-[color-mix(in_srgb,var(--color-surface-alt)_38%,var(--color-surface))]">
          <div className="px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1 pr-1">
                <p
                  id="pl-partidas-heading"
                  className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-orbita-secondary"
                >
                  Partidas del mes
                </p>
                <p className="mt-1.5 w-full min-w-0 max-w-full text-pretty text-[10px] leading-relaxed text-orbita-muted [overflow-wrap:anywhere] sm:text-[11px]">
                  Montos del mes en COP por bloques: fondo en totales y saldos; el resto es detalle. Pasa el cursor sobre
                  la línea punteada para ver definiciones.
                </p>
              </div>
              <div className="flex shrink-0 justify-end sm:pt-0.5">
                <PlKpiSourcePill source={financeMeta?.kpiSource} label={`Fuente: ${kpiSourceLabel}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="table-fixed w-full min-w-[min(100%,520px)] border-collapse text-left text-[10px] leading-snug">
            <caption className="sr-only">
              Estado de resultados del mes: concepto en la primera columna; importe del mes en pesos colombianos en la segunda.
            </caption>
            <colgroup>
              <col style={{ width: "58%" }} />
              <col style={{ width: "42%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-orbita-border/60 bg-orbita-surface-alt/40 text-[10px] uppercase tracking-[0.14em] text-orbita-secondary">
                <th scope="col" className="px-4 py-2.5 text-left font-semibold sm:px-5">
                  Concepto / partida
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold tabular-nums sm:px-5">
                  <abbr title="Pesos colombianos — importe del mes" className="cursor-help no-underline decoration-transparent">
                    Importe (COP)
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {plMainGroups.map((g, blockIndex) => {
                const rows = layersForGroup(c.plLayers, g.layerIds)
                const headClass = SECTION_HEAD_CLASS[g.id] ?? "bg-orbita-surface-alt/50"
                return (
                  <Fragment key={g.id}>
                    <tr className={`border-b border-orbita-border/50 ${headClass}`}>
                      <td colSpan={2} className="px-4 py-2 sm:px-5">
                        <div className="flex flex-wrap items-start gap-2.5">
                          <span
                            className="mt-0.5 inline-flex h-6 min-w-[1.375rem] shrink-0 items-center justify-center rounded-md bg-orbita-surface/85 px-1.5 text-[10px] font-bold tabular-nums text-orbita-primary shadow-sm ring-1 ring-orbita-border/55"
                            aria-hidden
                          >
                            {blockIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orbita-primary">{g.title}</p>
                            {g.subtitle ? (
                              <p className="mt-1 max-w-prose text-[10px] leading-relaxed text-orbita-muted">{g.subtitle}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <PlLayerRows layers={rows} />
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {plConciliationGroup ? (
          <details className="group border-t border-orbita-border/60 bg-orbita-surface-alt/15">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
                <span
                  className="mt-0.5 inline-flex h-6 min-w-[1.375rem] shrink-0 items-center justify-center rounded-md bg-orbita-surface/85 px-1.5 text-[10px] font-bold tabular-nums text-orbita-primary shadow-sm ring-1 ring-orbita-border/55"
                  aria-hidden
                >
                  4
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orbita-primary">
                    {plConciliationGroup.title}
                  </p>
                  {plConciliationGroup.subtitle ? (
                    <p className="mt-1 max-w-prose text-[10px] leading-relaxed text-orbita-muted">{plConciliationGroup.subtitle}</p>
                  ) : null}
                </div>
              </div>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-orbita-secondary transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-orbita-border/50 px-4 pb-3 pt-2 sm:px-5">
              {showEmaHint ? (
                <div
                  className="mb-2 flex gap-2 rounded-md border border-orbita-border/55 bg-orbita-surface-alt/25 p-2.5 text-[10px] leading-snug text-orbita-secondary"
                  role="status"
                >
                  <ArrowDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orbita-muted" aria-hidden />
                  <p>
                    <span className="font-semibold text-orbita-primary">Referencia habitual:</span>{" "}
                    <span className="tabular-nums">${formatMoney(c.hintEmaAbsGap ?? 0)}</span>
                    {" · "}este mes:{" "}
                    <span className="tabular-nums font-medium">${formatMoney(c.unexplainedKpiStructural)}</span>
                  </p>
                </div>
              ) : null}
              <div className="touch-pan-x overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <table className="table-fixed w-full min-w-[min(100%,520px)] border-collapse text-left text-[10px] leading-snug">
                  <colgroup>
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "50%" }} />
                  </colgroup>
                  <tbody>
                    <PlLayerRows layers={layersForGroup(c.plLayers, plConciliationGroup.layerIds)} />
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ) : null}
      </Card>

      <Card id="pl-puentes-card" className="min-w-0 overflow-hidden border-orbita-border/80 p-0">
        {/* Título + copy a la izquierda; chip de estado fijo arriba a la derecha */}
        <div className="flex items-start justify-between gap-x-3 gap-y-2 border-b border-orbita-border/55 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1 space-y-0.5 pr-1">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-orbita-primary sm:text-[11px]">
              Puentes
            </h3>
            <p className="m-0 text-[10px] leading-snug text-orbita-muted sm:text-[11px]">
              Ajustes opcionales entre KPI del resumen y categorías.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {c.bridgeEntries.length === 0 ? (
              <span
                className="inline-flex items-center rounded-full border border-amber-500/45 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/55 dark:text-amber-50 sm:text-[10px]"
                role="status"
              >
                Sin ajustes
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100 sm:text-[10px]">
                {c.bridgeEntries.length} activo{c.bridgeEntries.length === 1 ? "" : "s"}
              </span>
            )}
            {!syncOn ? (
              <span className="max-w-[14rem] text-right text-[9px] leading-tight text-orbita-muted sm:text-[10px]">
                Solo lectura — activa Supabase para añadir.
              </span>
            ) : null}
          </div>
        </div>

        {c.bridgeEntries.length > 0 ? (
          <ul className="space-y-1 border-b border-orbita-border/40 px-3 py-2 sm:px-4">
            {c.bridgeEntries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-orbita-border/50 bg-orbita-surface-alt/25 px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-tight text-orbita-primary">{e.label || "Ajuste"}</p>
                  <p className="text-[9px] text-orbita-muted sm:text-[10px]">
                    {e.bridge_kind === "kpi_structural" ? "Cuadre con categorías" : "Otro"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <MoneyCell value={e.amount_cop} />
                  {syncOn ? (
                    <button
                      type="button"
                      onClick={() => onDeleteBridge(e.id)}
                      className="rounded-md p-1 text-orbita-muted hover:bg-orbita-surface hover:text-orbita-accent-danger"
                      aria-label="Eliminar puente"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {syncOn ? (
          <details className="group border-b border-orbita-border/55">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-orbita-surface-alt/35 px-3 py-2 sm:px-4 [&::-webkit-details-marker]:hidden">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
                Añadir puente
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="grid gap-3 border-t border-orbita-border/45 p-3 sm:p-4">
              <form onSubmit={onSubmitBridge} className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1 text-[10px] font-medium text-orbita-secondary sm:text-xs">
                    Monto (COP)
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="min-h-9 rounded-md border border-orbita-border bg-orbita-surface px-2.5 py-1.5 text-xs sm:text-sm"
                      placeholder="250000"
                      autoComplete="off"
                    />
                  </label>
                  <label className="grid gap-1 text-[10px] font-medium text-orbita-secondary sm:text-xs">
                    Tipo
                    <select
                      value={bridgeKind}
                      onChange={(e) => setBridgeKind(e.target.value as "kpi_structural" | "other")}
                      className="min-h-9 rounded-md border border-orbita-border bg-orbita-surface px-2.5 py-1.5 text-xs sm:text-sm"
                    >
                      <option value="kpi_structural">Cuadre con categorías</option>
                      <option value="other">Otro</option>
                    </select>
                  </label>
                </div>
                <label className="grid gap-1 text-[10px] font-medium text-orbita-secondary sm:text-xs">
                  Etiqueta
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="min-h-9 rounded-md border border-orbita-border bg-orbita-surface px-2.5 py-1.5 text-xs sm:text-sm"
                    placeholder="Ej. Timing nómina vs categoría"
                  />
                </label>
                {formError ? <p className="text-xs text-orbita-accent-danger">{formError}</p> : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-9 w-full rounded-md bg-orbita-primary px-3 text-xs font-semibold text-white disabled:opacity-50 sm:w-auto sm:text-sm"
                >
                  {submitting ? "Guardando…" : "Guardar"}
                </button>
              </form>
            </div>
          </details>
        ) : null}
      </Card>
    </div>
  )
}
