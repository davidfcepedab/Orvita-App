"use client"

import { FormEvent, type ReactNode, useMemo, useState } from "react"
import { ArrowDownRight, ArrowRight, CheckCircle2, CircleAlert, Printer, Trash2 } from "lucide-react"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
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

const PL_GROUPS: { id: string; title: string; subtitle: string; layerIds: string[] }[] = [
  {
    id: "caja",
    title: "Flujo de caja",
    subtitle: "Ingresos y egresos del mes (movimientos)",
    layerIds: ["income", "expense_all", "net"],
  },
  {
    id: "operativo",
    title: "Operativo vs mapa",
    subtitle: "KPI catálogo, mapa fijo/variable y brecha",
    layerIds: ["opex_kpi", "outside_kpi", "structural_ui", "modulo_structural", "gap_kpi_struct"],
  },
  {
    id: "cierre",
    title: "Cierre",
    subtitle: "Puentes y brecha restante",
    layerIds: ["bridges", "unexplained"],
  },
]

function layersForGroup(layers: CanonicalPlLayer[], ids: string[]) {
  const set = new Set(ids)
  return layers.filter((L) => set.has(L.id))
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: ReactNode
  sub?: string
  accent: "slate" | "emerald" | "rose" | "sky"
}) {
  const ring =
    accent === "emerald"
      ? "border-emerald-500/25 bg-emerald-500/[0.07]"
      : accent === "rose"
        ? "border-rose-500/25 bg-rose-500/[0.07]"
        : accent === "sky"
          ? "border-sky-500/25 bg-sky-500/[0.07]"
          : "border-orbita-border/80 bg-orbita-surface-alt/50"
  return (
    <div className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${ring}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-orbita-primary sm:text-xl">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-orbita-muted">{sub}</p> : null}
    </div>
  )
}

export function FinanzasPlDashboard() {
  const { financeMeta, financeMetaLoading, month, touchCapitalData } = useFinanceOrThrow()
  const c = financeMeta?.coherence
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
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }, [month])

  const showEmaHint = useMemo(() => {
    if (!c?.hintEmaAbsGap) return false
    return c.hintEmaAbsGap > 1
  }, [c?.hintEmaAbsGap])

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
        <div className="h-36 rounded-2xl bg-orbita-surface-alt/80" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-40 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-40 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-40 rounded-xl bg-orbita-surface-alt/70" />
        </div>
      </div>
    )
  }

  if (!c && financeMeta) {
    return (
      <Card className="border-orbita-border/80 p-5 sm:p-6">
        <p className="text-base font-semibold text-orbita-primary">Sin P&amp;L para este periodo</p>
        <p className="mt-2 text-sm leading-relaxed text-orbita-secondary">
          {financeMeta.transactionsInSelectedMonth === 0
            ? "No hay movimientos en el mes seleccionado. Importa o registra transacciones para construir el estado de resultados y la conciliación KPI vs mapa."
            : "No se pudo calcular el desglose. Revisa la conexión o vuelve a intentar."}
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

  return (
    <div className="space-y-4 sm:space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl border border-orbita-border/70 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent-finance) 12%, var(--color-surface)) 0%, var(--color-surface) 45%, color-mix(in srgb, var(--color-surface-alt) 90%, var(--color-surface)) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-20%,color-mix(in_srgb,var(--color-accent-finance)_22%,transparent),transparent)] pointer-events-none" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orbita-secondary">Mes activo</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-orbita-primary sm:text-2xl capitalize">
                {monthLabel}
              </h2>
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-orbita-secondary sm:text-sm">
                Tres bloques: caja (movimientos), operativo (KPI y mapa de categorías) y cierre (puentes). Las{" "}
                <strong className="font-semibold text-orbita-primary">Cuentas</strong> son saldos ledger; viven en su pestaña.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  residualOk ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/15 text-amber-900 dark:text-amber-100"
                }`}
              >
                {residualOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                Flujo {residualOk ? "cuadrado" : "revisar"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  bridgeOk ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "bg-sky-500/15 text-sky-950 dark:text-sky-100"
                }`}
              >
                {bridgeOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                KPI vs mapa {bridgeOk ? "ok" : "pendiente"}
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

          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatTile
              label="Ingresos"
              value={<MoneyCell value={c.incomeTotal} />}
              accent="slate"
            />
            <StatTile
              label="Gasto total"
              value={<MoneyCell value={c.expenseTotalAll} variant="danger" />}
              sub="Todos los egresos"
              accent="rose"
            />
            <StatTile
              label="Flujo neto"
              value={<MoneyCell value={c.netCashFlow} variant={c.netCashFlow >= 0 ? "success" : "danger"} />}
              sub="Como «Total movimientos»"
              accent="emerald"
            />
            <StatTile
              label="Brecha sin explicar"
              value={<MoneyCell value={c.unexplainedKpiStructural} />}
              sub="KPI − mapa − puentes"
              accent="sky"
            />
          </div>
        </div>
      </div>

      {showEmaHint ? (
        <div
          className="flex gap-3 rounded-xl border border-sky-400/35 bg-sky-500/[0.08] p-4 text-sm dark:border-sky-500/30 dark:bg-sky-950/40"
          role="status"
        >
          <ArrowDownRight className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />
          <div>
            <p className="font-semibold text-orbita-primary dark:text-sky-50">Referencia histórica (EMA)</p>
            <p className="mt-1 text-orbita-secondary dark:text-sky-100/90">
              Lo que suele quedar sin explicar entre KPI y mapa ha rondado{" "}
              <span className="font-semibold tabular-nums text-orbita-primary">${formatMoney(c.hintEmaAbsGap ?? 0)} COP</span>.
              Este mes:{" "}
              <span className="font-semibold tabular-nums text-orbita-primary">${formatMoney(c.unexplainedKpiStructural)} COP</span>
              {Math.abs(c.unexplainedKpiStructural) < 1 ? " (cerrado)." : "."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {PL_GROUPS.map((g) => {
          const rows = layersForGroup(c.plLayers, g.layerIds)
          return (
            <Card
              key={g.id}
              className="flex min-h-[200px] flex-col border-orbita-border/80 p-4 shadow-[var(--shadow-card)] sm:p-5"
            >
              <div className="border-b border-orbita-border/50 pb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-orbita-secondary">{g.title}</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-orbita-muted">{g.subtitle}</p>
              </div>
              <ul className="mt-3 flex flex-1 flex-col gap-2.5">
                {rows.map((layer) => (
                  <li key={layer.id} className="rounded-lg bg-orbita-surface-alt/40 px-2.5 py-2 sm:px-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] leading-snug text-orbita-secondary sm:text-sm">{layer.label}</span>
                      <MoneyCell
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
                      <p className="mt-1 text-[10px] leading-snug text-orbita-muted sm:text-[11px]">{layer.hint}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <Card className="border-orbita-border/80 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-orbita-primary">Puentes de conciliación</h3>
        <p className="mt-1 text-xs leading-relaxed text-orbita-secondary">
          Registra explicaciones monetarias de la brecha KPI vs mapa. Se guardan por mes y alimentan la referencia EMA.
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
          <p className="mt-3 text-sm text-orbita-muted">Sin puentes en este mes.</p>
        )}

        {syncOn ? (
          <form onSubmit={onSubmitBridge} className="mt-5 space-y-3 rounded-xl border border-dashed border-orbita-border/80 bg-orbita-surface-alt/25 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-orbita-secondary">
                Monto (COP)
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                  placeholder="Ej. 250000"
                />
              </label>
              <label className="grid gap-1 text-xs text-orbita-secondary">
                Tipo
                <select
                  value={bridgeKind}
                  onChange={(e) => setBridgeKind(e.target.value as "kpi_structural" | "other")}
                  className="rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                >
                  <option value="kpi_structural">Brecha KPI vs mapa</option>
                  <option value="other">Otro</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-xs text-orbita-secondary">
              Etiqueta
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded-lg border border-orbita-border bg-orbita-surface px-3 py-2 text-sm"
                placeholder="Ej. Timing nómina vs categoría"
              />
            </label>
            {formError ? <p className="text-sm text-orbita-accent-danger">{formError}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-orbita-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Guardar puente"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-orbita-muted">Activa Supabase para persistir puentes.</p>
        )}
      </Card>
    </div>
  )
}
