"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from "recharts"
import { useFinance } from "../../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import type { CategoryAnalyticsPayload, StrategicInsight } from "@/lib/finanzas/categoryAnalyticsEngine"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

const PIE_COLORS = [
  "var(--color-accent-finance)",
  "var(--color-accent-health)",
  "var(--color-accent-danger)",
  "#6366f1",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#14b8a6",
]

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))
}

function momTone(mom: number | null, alert: number) {
  if (mom == null || !Number.isFinite(mom)) return "text-orbita-secondary"
  if (mom >= alert) return "text-rose-600 font-semibold"
  if (mom >= alert * 0.55) return "text-amber-700 font-medium"
  return "text-orbita-primary"
}

function InsightCard({ insight }: { insight: StrategicInsight }) {
  const border =
    insight.impact === "alto"
      ? "border-rose-300/80 bg-[color-mix(in_srgb,var(--color-accent-danger)_8%,var(--color-surface))]"
      : insight.impact === "medio"
        ? "border-amber-300/70 bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))]"
        : "border-orbita-border/60 bg-orbita-surface-alt/40"
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${border}`}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbita-secondary">{insight.impact}</p>
        {insight.savingsMonthly != null ? (
          <span className="text-[10px] tabular-nums text-emerald-700">
            ~${formatCop(insight.savingsMonthly)}/mes
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold leading-snug text-orbita-primary">{insight.title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-orbita-secondary">{insight.body}</p>
      {insight.ctaHref ? (
        <Link
          href={insight.ctaHref}
          className="mt-2 inline-flex text-[11px] font-semibold text-[var(--color-accent-finance)] underline-offset-4 hover:underline"
        >
          {insight.ctaLabel ?? "Abrir"}
        </Link>
      ) : null}
    </div>
  )
}

export function CategoryAnalysisPanels({ mode }: { mode: "estrategica" | "predictiva" }) {
  const finance = useFinance()
  const router = useRouter()
  const month = finance?.month ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0

  const [data, setData] = useState<CategoryAnalyticsPayload | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [momAlert, setMomAlert] = useState(15)

  const load = useCallback(async () => {
    if (!month) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      q.set("month", month)
      q.set("mom_alert", String(momAlert))
      const res = await financeApiGet(`/api/orbita/finanzas/category-analytics?${q.toString()}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: CategoryAnalyticsPayload | null
        error?: string
        notice?: string
      }
      if (!res.ok || !json.success) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      setNotice(json.notice ?? null)
      setData(json.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [month, momAlert, capitalEpoch])

  useEffect(() => {
    void load()
  }, [load])

  const drillTx = (opts: { category: string; subcategory?: string }) => {
    const p = new URLSearchParams()
    p.set("month", month)
    p.set("category", opts.category)
    if (opts.subcategory) p.set("subcategory", opts.subcategory)
    p.set("tipo", "gasto")
    router.push(`/finanzas/transactions?${p.toString()}`)
  }

  const growthChartData = useMemo(() => {
    if (!data) return []
    return data.fastGrowing.slice(0, 10).map((r) => ({
      name:
        r.category.length > 14 ? `${r.category.slice(0, 12)}…` : r.category,
      fullName: r.category,
      mom: r.momPct ?? 0,
      monto: r.expenseCurrent,
      severity: r.severity,
    }))
  }, [data])

  const antPieData = useMemo(() => {
    if (!data) return []
    return data.antExpenses.slice(0, 8).map((r) => ({
      name: r.subcategory.length > 16 ? `${r.subcategory.slice(0, 14)}…` : r.subcategory,
      value: r.total,
      key: r.key,
    }))
  }, [data])

  const netChartData = useMemo(() => {
    if (!data) return []
    return data.netForecast.map((row) => ({
      label: row.month,
      net: row.net,
      projected: Boolean(row.isProjected),
    }))
  }, [data])

  if (!finance || !month) {
    return (
      <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt/40 px-4 py-6 text-center text-sm text-orbita-secondary">
        Selecciona un mes en la cabecera de finanzas.
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt/30 px-4 py-10 text-center text-sm text-orbita-secondary">
        Construyendo análisis de categorías…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-sm"
        style={{
          borderColor: "color-mix(in srgb, var(--color-accent-danger) 35%, var(--color-border))",
          background: "color-mix(in srgb, var(--color-accent-danger) 8%, var(--color-surface))",
          color: "var(--color-accent-danger)",
        }}
      >
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt/40 px-4 py-6 text-center text-sm text-orbita-secondary">
        {notice ?? "Sin datos de análisis para este periodo."}
      </div>
    )
  }

  const alertPct = data.params.momAlertPct

  return (
    <div className="space-y-4">
      {notice ? (
        <p className="text-center text-[11px] text-amber-800 dark:text-amber-200">{notice}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="grid max-w-xs gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
            Umbral alerta MoM (%)
          </span>
          <input
            type="range"
            min={8}
            max={35}
            value={momAlert}
            onChange={(e) => setMomAlert(Number(e.target.value))}
            className="w-full accent-[var(--color-accent-finance)]"
          />
          <span className="text-[11px] text-orbita-secondary">{momAlert}% — resalta filas y barras por encima</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Gasto (mes)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-orbita-primary">${formatCop(data.kpis.totalExpenseAnchor)}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">vs mes anterior</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              (data.kpis.vsPrevExpensePct ?? 0) > 5 ? "text-rose-600" : "text-orbita-primary"
            }`}
          >
            {data.kpis.vsPrevExpensePct == null ? "—" : `${data.kpis.vsPrevExpensePct >= 0 ? "+" : ""}${data.kpis.vsPrevExpensePct.toFixed(1)}%`}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">vs prom. 6 meses</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-orbita-primary">
            {data.kpis.vsAvg6ExpensePct == null ? "—" : `${data.kpis.vsAvg6ExpensePct >= 0 ? "+" : ""}${data.kpis.vsAvg6ExpensePct.toFixed(1)}%`}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Flujo neto (mes)</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              data.kpis.netAnchor >= 0 ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {data.kpis.netAnchor >= 0 ? "+" : ""}${formatCop(data.kpis.netAnchor)}
          </p>
        </Card>
      </div>

      {mode === "estrategica" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(17rem,22rem)] lg:items-start">
          <div className="space-y-4">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-orbita-border/60 px-3 py-2.5 sm:px-4">
                <h3 className="text-sm font-semibold text-orbita-primary">Categorías con crecimiento (MoM / YoY)</h3>
                <p className="text-[11px] text-orbita-secondary">
                  Orden por impacto (MoM). Proyección lineal simple a 3 meses desde la serie reciente.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-orbita-border/70 text-orbita-secondary">
                      <th className="px-2 py-2 font-medium sm:px-3">Categoría</th>
                      <th className="px-2 py-2 text-right font-medium sm:px-3">Gasto mes</th>
                      <th className="px-2 py-2 text-right font-medium sm:px-3">MoM %</th>
                      <th className="px-2 py-2 text-right font-medium sm:px-3">YoY %</th>
                      <th className="px-2 py-2 text-right font-medium sm:px-3">+3m (proj.)</th>
                      <th className="px-2 py-2 sm:px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.fastGrowing.slice(0, 18).map((r) => (
                      <tr
                        key={r.category}
                        className={`border-b border-orbita-border/40 ${
                          r.severity === "alert" ? "bg-[color-mix(in_srgb,var(--color-accent-danger)_7%,transparent)]" : ""
                        } ${r.severity === "watch" ? "bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,transparent)]" : ""}`}
                      >
                        <td className="px-2 py-1.5 font-medium text-orbita-primary sm:px-3">{r.category}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">${formatCop(r.expenseCurrent)}</td>
                        <td className={`px-2 py-1.5 text-right tabular-nums sm:px-3 ${momTone(r.momPct, alertPct)}`}>
                          {r.momPct == null ? "—" : `${r.momPct >= 0 ? "+" : ""}${r.momPct.toFixed(1)}%`}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                          {r.yoyPct == null ? "—" : `${r.yoyPct >= 0 ? "+" : ""}${r.yoyPct.toFixed(1)}%`}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                          ${formatCop(r.forecastNext3[2] ?? 0)}
                        </td>
                        <td className="px-2 py-1.5 sm:px-3">
                          <button
                            type="button"
                            onClick={() => drillTx({ category: r.category })}
                            className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-finance)] hover:underline"
                          >
                            Movimientos
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="h-56 w-full border-t border-orbita-border/50 px-2 pb-2 pt-3 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthChartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.45} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={56} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={36} />
                    <Tooltip
                      contentStyle={rechartsTooltipContentStyle}
                      formatter={(value, _n, p) => {
                        const v = typeof value === "number" ? value : Number(value)
                        const monto = (p?.payload as { monto?: number } | undefined)?.monto ?? 0
                        return [`${Number.isFinite(v) ? v.toFixed(1) : "—"}% MoM · $${formatCop(monto)}`, "Variación"]
                      }}
                    />
                    <Bar dataKey="mom" name="MoM %" radius={[4, 4, 0, 0]}>
                      {growthChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.severity === "alert"
                              ? "var(--color-accent-danger)"
                              : entry.severity === "watch"
                                ? "color-mix(in srgb, var(--color-accent-finance) 70%, var(--color-accent-danger))"
                                : "var(--color-accent-finance)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="overflow-hidden p-0">
                <div className="border-b border-orbita-border/60 px-3 py-2.5 sm:px-4">
                  <h3 className="text-sm font-semibold text-orbita-primary">Gastos hormiga (alto impacto)</h3>
                  <p className="text-[11px] text-orbita-secondary">
                    Cargos pequeños recurrentes con peso ≥{(data.params.antShareMin * 100).toFixed(1)}% del gasto y ticket
                    medio ≤ ${formatCop(data.params.antTicketMax)}.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-orbita-border/70 text-orbita-secondary">
                        <th className="px-2 py-2 font-medium sm:px-3">Subcategoría</th>
                        <th className="px-2 py-2 text-right font-medium sm:px-3">Total</th>
                        <th className="px-2 py-2 text-right font-medium sm:px-3">% gasto</th>
                        <th className="px-2 py-2 text-right font-medium sm:px-3">Freq.</th>
                        <th className="px-2 py-2 text-right font-medium sm:px-3">Tend.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.antExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-orbita-secondary">
                            No se detectaron patrones con los umbrales actuales.
                          </td>
                        </tr>
                      ) : (
                        data.antExpenses.map((r) => (
                          <tr key={r.key} className="border-b border-orbita-border/40">
                            <td className="px-2 py-1.5 sm:px-3">
                              <button
                                type="button"
                                onClick={() => drillTx({ category: r.category, subcategory: r.subcategory })}
                                className="text-left font-medium text-orbita-primary hover:underline"
                              >
                                {r.subcategory}
                                <span className="block text-[10px] font-normal text-orbita-secondary">{r.category}</span>
                              </button>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">${formatCop(r.total)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">{r.sharePct.toFixed(1)}%</td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">{r.txCount}</td>
                            <td className="px-2 py-1.5 text-right text-orbita-secondary sm:px-3">
                              {r.trendLabel === "up" ? "↑" : r.trendLabel === "down" ? "↓" : "→"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="h-52 w-full border-t border-orbita-border/50 px-2 pb-2 pt-3">
                  {antPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={antPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {antPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]!} stroke="var(--color-border)" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={rechartsTooltipContentStyle}
                          formatter={(v) => [`$${formatCop(Number(v))}`, "Monto"]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] text-orbita-secondary">
                      Sin segmentos para donut
                    </div>
                  )}
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <div className="border-b border-orbita-border/60 px-3 py-2.5 sm:px-4">
                  <h3 className="text-sm font-semibold text-orbita-primary">Distribución del mes</h3>
                  <p className="text-[11px] text-orbita-secondary">Gastos e ingresos; compara mentalmente con el mes previo en la tabla de crecimiento.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4">
                  <div className="h-52">
                    <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
                      Gastos
                    </p>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expensePie.slice(0, 10)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                        >
                          {data.expensePie.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]!} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={rechartsTooltipContentStyle}
                          formatter={(v, _n, props) => {
                            const p = props?.payload as { pct?: number }
                            return [`$${formatCop(Number(v))} (${(p?.pct ?? 0).toFixed(1)}%)`, props?.name]
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-52">
                    <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
                      Ingresos
                    </p>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.incomePie.slice(0, 10)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                        >
                          {data.incomePie.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]!} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={rechartsTooltipContentStyle}
                          formatter={(v, _n, props) => {
                            const p = props?.payload as { pct?: number }
                            return [`$${formatCop(Number(v))} (${(p?.pct ?? 0).toFixed(1)}%)`, props?.name]
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="border-t border-orbita-border/50 px-3 py-2.5 text-[10px] leading-relaxed text-orbita-secondary sm:px-4">
                  <span className="font-semibold text-orbita-primary">Comparativa rápida (gasto categoría vs mes previo):</span>{" "}
                  {data.expensePie.slice(0, 5).map((s) => {
                    const prev = data.compare.prevMonthExpenseByCategory[s.name] ?? 0
                    const d = prev > 1e-6 ? ((s.value - prev) / prev) * 100 : null
                    const txt =
                      d == null || !Number.isFinite(d)
                        ? `${s.name}: nuevo`
                        : `${s.name}: ${d >= 0 ? "+" : ""}${d.toFixed(0)}%`
                    return txt
                  }).join(" · ")}
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-3 lg:sticky lg:top-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">Insights</p>
            {data.insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-orbita-border/60 px-3 py-2.5 sm:px-4">
              <h3 className="text-sm font-semibold text-orbita-primary">Flujo de caja — histórico y proyección</h3>
              <p className="text-[11px] text-orbita-secondary">
                Regresión lineal sobre los últimos meses; la parte punteada es escenario, no promesa.
              </p>
            </div>
            <div className="h-72 w-full px-2 pb-3 pt-4 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netChartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.45} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.floor(netChartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCop(v)} width={52} />
                  <Tooltip
                    contentStyle={rechartsTooltipContentStyle}
                    formatter={(v) => [`$${formatCop(Number(v))}`, "Flujo"]}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--color-accent-finance)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Flujo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                Si contienes crecimientos rápidos (escenario)
              </p>
              <p className="mt-1 text-xl font-semibold text-orbita-primary">
                +${formatCop(data.scenarioImpact.ifReduceFastGrowingByScenario)} / mes
              </p>
              <p className="mt-1 text-[11px] text-orbita-secondary">
                Estimación conservadora sobre categorías en alerta; úsala como orden de magnitud.
              </p>
            </Card>
            <Card className="p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                Si recortas a la mitad el bloque hormiga
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">
                +${formatCop(data.scenarioImpact.ifTrimAntByHalf)} / mes
              </p>
              <p className="mt-1 text-[11px] text-orbita-secondary">
                Suma de subcategorías detectadas; impacto directo en capital operativo mensual.
              </p>
            </Card>
          </div>

          <Card className="p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-orbita-primary">Presión proyectada + acciones</h3>
            <p className="mt-1 text-[11px] text-orbita-secondary">
              Combina el gráfico de flujo con los insights: reducir hormiga o frenar categorías en alerta desplaza la
              línea proyectada hacia arriba.
            </p>
            <div className="mt-3 space-y-2">
              {data.insights.slice(0, 5).map((ins) => (
                <InsightCard key={`p-${ins.id}`} insight={ins} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
