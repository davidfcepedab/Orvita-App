"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ChevronDown, Trash2, TrendingUp } from "lucide-react"
import { financeApiDelete, financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { CuentasKpis } from "@/lib/finanzas/cuentasDashboard"
import { dayFromIso, isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import type { FlowCommitment, FlowCommitmentFlowType } from "@/lib/finanzas/flowCommitmentsTypes"
import {
  readFlowCommitmentsFromLocalStorage,
  writeFlowCommitmentsToLocalStorage,
} from "@/lib/finanzas/flowCommitmentsLocal"
import {
  financeCardMicroLabelClass,
  financeModuleHeroTaglineClass,
  financeSectionEyebrowClass,
} from "../_components/financeChrome"
import { CuentasModalShell } from "./CuentasModalShell"
import { formatMoney } from "./cuentasFormat"
import { cn } from "@/lib/utils"

export type CashFlowSimulatorSectionProps = {
  month: string
  kpis: CuentasKpis | null
  supabaseEnabled: boolean
  subscriptionFixedMonthly: number
  onApplyPaymentPlan: () => void
  bridgeHost?: boolean
  accessDeepLinkEditor?: boolean
  openCommitmentsEditorSignal?: number
  onCommitmentsPersisted?: () => void
}

type FlowRow = { month: string; ingresos: number; gasto_operativo: number; flujo: number }

type Commitment = FlowCommitment
type CommitmentFlowType = FlowCommitmentFlowType
type CommitmentModalRow = FlowCommitment & { _isNew?: boolean }

const CAT_PAIR_SEP = "\u0001"
function encodeCatPair(category: string, subcategory: string) {
  return `${category.trim()}${CAT_PAIR_SEP}${subcategory.trim()}`
}
function decodeCatPair(v: string): { category: string; subcategory: string } {
  const i = v.indexOf(CAT_PAIR_SEP)
  if (i < 0) return { category: v.trim(), subcategory: "" }
  return { category: v.slice(0, i).trim(), subcategory: v.slice(i + CAT_PAIR_SEP.length).trim() }
}

type CatalogPairRow = { category: string; subcategory: string }

/** Lista desplegable: muestra subcategoría; el value sigue siendo cat+sub (decode al elegir). */
function buildCommitmentSubcategorySelectOptions(rows: CatalogPairRow[]): { value: string; label: string }[] {
  const pairs: CatalogPairRow[] = []
  const seenVal = new Set<string>()
  for (const r of rows) {
    const category = String(r.category ?? "").trim()
    const subcategory = String(r.subcategory ?? "").trim()
    if (!category && !subcategory) continue
    const value = encodeCatPair(category, subcategory)
    if (seenVal.has(value)) continue
    seenVal.add(value)
    pairs.push({ category, subcategory })
  }

  const subNormCounts = new Map<string, number>()
  for (const p of pairs) {
    if (!p.subcategory) continue
    const k = p.subcategory.toLowerCase()
    subNormCounts.set(k, (subNormCounts.get(k) ?? 0) + 1)
  }

  const opts = pairs.map((p) => {
    const value = encodeCatPair(p.category, p.subcategory)
    let label: string
    if (p.subcategory) {
      const ambiguous = (subNormCounts.get(p.subcategory.toLowerCase()) ?? 0) > 1
      label = ambiguous ? `${p.subcategory} (${p.category})` : p.subcategory
    } else {
      label = p.category || "—"
    }
    return { value, label }
  })

  return opts.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))
}

function mergeCommitmentCatalogPairsForSelect(
  catalogRows: CatalogPairRow[],
  modalRows: CommitmentModalRow[],
): { value: string; label: string }[] {
  const merged: CatalogPairRow[] = []
  const seen = new Set<string>()
  const push = (category: string, subcategory: string) => {
    const c = category.trim()
    const s = subcategory.trim()
    if (!c && !s) return
    const v = encodeCatPair(c, s)
    if (seen.has(v)) return
    seen.add(v)
    merged.push({ category: c, subcategory: s })
  }
  for (const r of catalogRows) push(r.category, r.subcategory ?? "")
  for (const r of modalRows) push(r.category, r.subcategory ?? "")
  return buildCommitmentSubcategorySelectOptions(merged)
}

const COMMITMENT_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)

function isIncomeCommitment(c: Commitment) {
  return c.flowType === "income"
}

function obligationCategoryLabel(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("arriendo") || n.includes("vivienda") || n.includes("rent") || n.includes("alquiler")) {
    return "Rent Payment"
  }
  if (n.includes("seguro") && (n.includes("salud") || n.includes("health"))) return "Health Insurance"
  if (n.includes("seguro")) return "Insurance"
  if (n.includes("internet") || n.includes("utilities") || n.includes("servicio")) return "Utilities"
  return "Fixed expense"
}

function formatCommitmentDayEn(isoDate: string) {
  const raw = isoDate.slice(0, 10)
  const [y, mo, da] = raw.split("-").map(Number)
  if (!y || !mo || !da) return raw
  const d = new Date(y, mo - 1, da)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const FLOW_TYPE_OPTIONS: { value: CommitmentFlowType; label: string }[] = [
  { value: "fixed", label: "Gasto fijo" },
  { value: "one-time", label: "Única vez" },
  { value: "recurring", label: "Recurrente" },
  { value: "income", label: "Ingreso" },
]

/** Shell principal: superficie clara + sombra fuerte vs el fondo grouped (`--color-background`). */
const cashFlowMajorShellClass =
  "rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-border)_78%,transparent)] bg-[linear-gradient(180deg,var(--color-surface)_0%,color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))_100%)] shadow-[var(--shadow-hover)]"

/** Bloques ingresos/gastos: agrupación ligera, sin caja inset (contenido “flota” sobre el shell). */
const cashFlowScenarioStackClass = "min-w-0 space-y-4 px-0 py-1 sm:py-2"

/** KPI del panel compromisos: capa intermedia entre shell y texto. */
const cashFlowKpiTileClass =
  "rounded-xl border border-[color-mix(in_srgb,var(--color-border)_68%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_48%,var(--color-background))] p-3 shadow-sm sm:rounded-2xl sm:p-4"

/** Pozos tabla/barras (7 meses): mismo familia inset, borde explícito. */
const cashFlowProjectionWellClass =
  "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_62%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_46%,var(--color-background))] p-3 shadow-inner sm:p-4"

function flowTypeBadgeClass(t: CommitmentFlowType) {
  if (t === "income") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (t === "recurring") return "border-sky-200 bg-sky-50 text-sky-900"
  if (t === "one-time") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-orbita-border bg-orbita-surface text-orbita-primary"
}

function CommitmentModalMobileCard({
  row,
  month,
  supabaseEnabled,
  catalogSelectOpts,
  setCommitModalRows,
}: {
  row: CommitmentModalRow
  month: string
  supabaseEnabled: boolean
  catalogSelectOpts: { value: string; label: string }[]
  setCommitModalRows: Dispatch<SetStateAction<CommitmentModalRow[]>>
}) {
  const ym = month || new Date().toISOString().slice(0, 7)
  return (
    <div className="rounded-lg border border-orbita-border/70 bg-orbita-surface p-2.5 shadow-sm">
      <div className="flex min-w-0 items-start gap-2">
        <input
          className="h-8 min-h-8 min-w-0 flex-1 rounded-md border border-orbita-border/80 bg-orbita-surface px-2 text-[12px] text-orbita-primary placeholder:text-orbita-muted"
          placeholder="Título / concepto"
          value={row.title}
          onChange={(e) =>
            setCommitModalRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)))
          }
        />
        <button
          type="button"
          className="shrink-0 rounded-md p-1.5 text-orbita-muted hover:bg-orbita-surface-alt hover:text-rose-600"
          aria-label="Quitar compromiso"
          onClick={() => setCommitModalRows((rs) => rs.filter((r) => r.id !== row.id))}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2">
        <div className="min-w-0">
          <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Día</span>
          <select
            className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
            value={row.dueDay ?? dayFromIso(row.date)}
            onChange={(e) => {
              const d = Number(e.target.value)
              setCommitModalRows((rs) =>
                rs.map((r) =>
                  r.id === row.id ? { ...r, dueDay: d, date: isoDateInMonth(ym, d) } : r,
                ),
              )
            }}
          >
            {COMMITMENT_DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Tipo</span>
          <select
            className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
            value={row.flowType}
            onChange={(e) =>
              setCommitModalRows((rs) =>
                rs.map((r) =>
                  r.id === row.id ? { ...r, flowType: e.target.value as CommitmentFlowType } : r,
                ),
              )
            }
          >
            {FLOW_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2">
        <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Monto</span>
        <input
          type="number"
          inputMode="numeric"
          className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-2 text-[11px] tabular-nums text-orbita-primary"
          value={row.amount || ""}
          onChange={(e) =>
            setCommitModalRows((rs) =>
              rs.map((r) =>
                r.id === row.id ? { ...r, amount: Math.max(0, Number(e.target.value)) } : r,
              ),
            )
          }
        />
      </div>
      <div className="mt-2">
        <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Subcategoría</span>
        {supabaseEnabled && catalogSelectOpts.length > 0 ? (
          <>
            <select
              className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
              value={
                row.category.trim() || row.subcategory.trim() ? encodeCatPair(row.category, row.subcategory) : ""
              }
              onChange={(e) => {
                const v = e.target.value
                const { category, subcategory } = v ? decodeCatPair(v) : { category: "", subcategory: "" }
                setCommitModalRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, category, subcategory } : r)))
              }}
            >
              <option value="">— Elegir —</option>
              {catalogSelectOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {row.category.trim() ? (
              <p className="mt-0.5 text-[10px] leading-snug text-orbita-muted">
                Categoría: <span className="font-medium text-orbita-secondary">{row.category.trim()}</span>
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-0.5 flex flex-col gap-0.5">
            <input
              className="h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1.5 text-[11px] text-orbita-primary"
              placeholder="Categoría"
              value={row.category}
              onChange={(e) =>
                setCommitModalRows((rs) =>
                  rs.map((r) => (r.id === row.id ? { ...r, category: e.target.value } : r)),
                )
              }
            />
            <input
              className="h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1.5 text-[11px] text-orbita-primary"
              placeholder="Subcategoría"
              value={row.subcategory ?? ""}
              onChange={(e) =>
                setCommitModalRows((rs) =>
                  rs.map((r) => (r.id === row.id ? { ...r, subcategory: e.target.value } : r)),
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

function addMonthsYm(ym: string, add: number): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  const d = new Date(y, m - 1 + add, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function ymLabel(ym: string) {
  const m = Number(ym.slice(5, 7))
  const SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return SHORT[(m || 1) - 1] ?? ym
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `c-${Date.now()}`
}

const EMPTY_CUENTAS_KPIS: CuentasKpis = {
  totalLiquidez: 0,
  liquidezTrendPct: 0,
  creditoDisponible: 0,
  creditoUsoPromedioPct: 0,
  deudaTotal: 0,
  deudaCuotaMensual: 0,
}

export function CashFlowSimulatorSection({
  month,
  kpis,
  supabaseEnabled,
  subscriptionFixedMonthly,
  onApplyPaymentPlan,
  bridgeHost = false,
  accessDeepLinkEditor = true,
  openCommitmentsEditorSignal = 0,
  onCommitmentsPersisted,
}: CashFlowSimulatorSectionProps) {
  const safeKpis = kpis ?? EMPTY_CUENTAS_KPIS
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [incomeBase, setIncomeBase] = useState(0)
  const [rolling, setRolling] = useState<FlowRow[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [commitmentsHydrated, setCommitmentsHydrated] = useState(false)
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitSaveErr, setCommitSaveErr] = useState<string | null>(null)
  const [commitModalRows, setCommitModalRows] = useState<CommitmentModalRow[]>([])
  const [commitModalInitialIds, setCommitModalInitialIds] = useState<Set<string>>(new Set())
  const [commitCatalogRows, setCommitCatalogRows] = useState<CatalogPairRow[]>([])
  const [simulatorExpanded, setSimulatorExpanded] = useState(false)
  const [commitmentsListExpanded, setCommitmentsListExpanded] = useState(false)
  const [flowViz, setFlowViz] = useState<"table" | "bars">("table")

  const [ingresosAdjustPct, setIngresosAdjustPct] = useState(0)
  const [gastosFijos, setGastosFijos] = useState(0)
  const [gastosVariables, setGastosVariables] = useState(0)
  const [ahorroObjetivo, setAhorroObjetivo] = useState(0)

  const searchParams = useSearchParams()
  const editorCommitConsumedRef = useRef(false)
  const lastCommitmentsEditorSignalRef = useRef(0)

  const commitmentCatalogSelectOpts = useMemo(
    () => mergeCommitmentCatalogPairsForSelect(commitCatalogRows, commitModalRows),
    [commitCatalogRows, commitModalRows],
  )

  const load = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setErr(null)
    try {
      const res = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: {
          income?: number
          expense?: number
          flowEvolution?: { rollingYear?: FlowRow[] }
          obligations?: { name: string; due: string; amount: number }[]
          flowCommitments?: FlowCommitment[]
        } | null
        error?: string
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      const d = json.data
      const inc = Number(d.income) || 0
      const exp = Number(d.expense) || 0
      setIncomeBase(inc)
      const yr = d.flowEvolution?.rollingYear ?? []
      setRolling(yr)
      const seeded: Commitment[] = (d.obligations ?? []).map((o) => {
        const title = o.name
        const cat = obligationCategoryLabel(o.name)
        const dueStr = o.due?.slice(0, 10) ?? `${month}-01`
        const dueDay = dayFromIso(dueStr)
        return {
          id: newId(),
          title,
          category: cat,
          subcategory: "",
          dueDay,
          date: isoDateInMonth(month, dueDay),
          amount: Number(o.amount) || 0,
          flowType: "fixed" as const,
        }
      })
      if (supabaseEnabled) {
        const fromApi = Array.isArray(d.flowCommitments) ? d.flowCommitments : []
        if (fromApi.length > 0) {
          setCommitments(fromApi)
        } else if (seeded.length > 0) {
          setCommitments(seeded)
        } else {
          setCommitments([])
        }
      } else {
        const stored = readFlowCommitmentsFromLocalStorage()
        if (stored.length > 0) {
          setCommitments(stored)
        } else if (seeded.length > 0) {
          setCommitments(seeded)
          writeFlowCommitmentsToLocalStorage(seeded)
        } else {
          setCommitments([])
        }
      }
      setCommitmentsHydrated(true)
      const defaultFijos = Math.round(safeKpis.deudaCuotaMensual * 0.42)
      const defaultVar = Math.round(exp * 0.32)
      setGastosFijos((f) => (f === 0 ? defaultFijos : f))
      setGastosVariables((v) => (v === 0 ? defaultVar : v))
      setAhorroObjetivo((a) => (a === 0 ? Math.max(0, Math.round(inc * 0.08)) : a))
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sin datos de overview")
      setIncomeBase((i) => i || 5_000_000)
      setGastosFijos((f) => f || Math.round(safeKpis.deudaCuotaMensual * 0.42))
      setGastosVariables((v) => v || 1_200_000)
      if (supabaseEnabled) {
        setCommitments([])
      } else {
        setCommitments(readFlowCommitmentsFromLocalStorage())
      }
      setCommitmentsHydrated(true)
    } finally {
      setLoading(false)
    }
  }, [month, safeKpis.deudaCuotaMensual, subscriptionFixedMonthly, supabaseEnabled])

  useEffect(() => {
    if (!commitmentsHydrated || supabaseEnabled) return
    writeFlowCommitmentsToLocalStorage(commitments)
  }, [commitments, commitmentsHydrated, supabaseEnabled])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncHash = () => {
      if (window.location.hash === "#capital-compromisos") setCommitmentsListExpanded(true)
    }
    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [])

  useEffect(() => {
    if (supabaseEnabled || !month || !commitmentsHydrated) return
    setCommitments((prev) =>
      prev.map((c) => {
        const d = c.dueDay ?? dayFromIso(c.date)
        return {
          ...c,
          subcategory: c.subcategory ?? "",
          dueDay: d,
          date: isoDateInMonth(month, d),
        }
      }),
    )
  }, [month, supabaseEnabled, commitmentsHydrated])

  useEffect(() => {
    if (!commitOpen || !supabaseEnabled) return
    let cancelled = false
    void (async () => {
      try {
        const res = await financeApiGet("/api/orbita/finanzas/subcategory-catalog")
        const json = (await res.json()) as {
          success?: boolean
          data?: { rows?: { category: string; subcategory: string }[] }
        }
        if (cancelled || !res.ok || !json.success) return
        const rows = json.data?.rows ?? []
        setCommitCatalogRows(
          rows.map((r) => ({
            category: String(r.category ?? "").trim(),
            subcategory: String(r.subcategory ?? "").trim(),
          })),
        )
      } catch {
        if (!cancelled) setCommitCatalogRows([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [commitOpen, supabaseEnabled])

  useEffect(() => {
    void load()
  }, [load])

  const trendFromHistory = useMemo(() => {
    if (rolling.length < 2) return 0
    const first = rolling[0]!.ingresos
    const last = rolling[rolling.length - 1]!.ingresos
    if (first < 1) return 0
    return ((last - first) / first) * 100
  }, [rolling])

  const incomeHistoricalAvg = useMemo(() => {
    if (rolling.length === 0) return incomeBase
    const s = rolling.reduce((a, r) => a + r.ingresos, 0)
    return s / rolling.length
  }, [rolling, incomeBase])

  const ingresosEstimados = useMemo(() => {
    const trendFactor = 1 + (trendFromHistory / 100) * 0.35
    const adj = 1 + ingresosAdjustPct / 100
    return Math.max(0, Math.round(incomeBase * trendFactor * adj))
  }, [incomeBase, trendFromHistory, ingresosAdjustPct])

  const variacionVsBasePct = useMemo(() => {
    if (incomeBase < 1) return 0
    return Math.round(((ingresosEstimados - incomeBase) / incomeBase) * 1000) / 10
  }, [ingresosEstimados, incomeBase])

  const fixedWithSubs = useMemo(
    () => Math.max(0, gastosFijos + subscriptionFixedMonthly),
    [gastosFijos, subscriptionFixedMonthly],
  )

  const totalGastosMes = useMemo(
    () => fixedWithSubs + Math.max(0, gastosVariables) + Math.max(0, ahorroObjetivo),
    [fixedWithSubs, gastosVariables, ahorroObjetivo],
  )

  const disponible = useMemo(() => ingresosEstimados - totalGastosMes, [ingresosEstimados, totalGastosMes])

  const netImpact30 = useMemo(
    () =>
      commitments.reduce((acc, c) => acc + (isIncomeCommitment(c) ? c.amount : -c.amount), 0),
    [commitments],
  )

  const commitmentsSorted = useMemo(
    () =>
      [...commitments].sort((a, b) => {
        const da = a.dueDay ?? dayFromIso(a.date)
        const db = b.dueDay ?? dayFromIso(b.date)
        if (da !== db) return da - db
        return a.title.localeCompare(b.title)
      }),
    [commitments],
  )

  const pipelineMonths = useMemo(() => {
    const out: { ym: string; label: string; ing: number; egr: number; net: number }[] = []
    for (let i = 0; i < 7; i += 1) {
      const ym = addMonthsYm(month, i)
      const drift = 1 + (trendFromHistory / 100) * (i / 8)
      const ing = Math.max(0, Math.round(ingresosEstimados * drift))
      const egr = Math.round(totalGastosMes * (1 + i * 0.008))
      out.push({
        ym,
        label: ymLabel(ym),
        ing,
        egr,
        net: ing - egr,
      })
    }
    return out
  }, [month, ingresosEstimados, totalGastosMes, trendFromHistory])

  const maxBar = useMemo(() => {
    let m = 1
    for (const row of pipelineMonths) {
      m = Math.max(m, row.ing, row.egr)
    }
    return m
  }, [pipelineMonths])

  const openCommitModal = useCallback(() => {
    setCommitSaveErr(null)
    const ym = month || new Date().toISOString().slice(0, 7)
    const rows = commitments.map((c) => {
      const dueDay = c.dueDay ?? dayFromIso(c.date)
      return {
        ...c,
        subcategory: c.subcategory ?? "",
        dueDay,
        date: isoDateInMonth(ym, dueDay),
      }
    })
    setCommitModalRows(rows)
    setCommitModalInitialIds(new Set(rows.map((r) => r.id)))
    setCommitOpen(true)
  }, [commitments, month])

  useEffect(() => {
    if (!accessDeepLinkEditor) return
    if (searchParams.get("editor") !== "compromisos") {
      editorCommitConsumedRef.current = false
      return
    }
    if (!commitmentsHydrated || loading || editorCommitConsumedRef.current) return
    editorCommitConsumedRef.current = true
    setCommitmentsListExpanded(true)
    openCommitModal()
  }, [
    accessDeepLinkEditor,
    commitmentsHydrated,
    loading,
    month,
    openCommitModal,
    searchParams,
  ])

  useEffect(() => {
    if (
      !openCommitmentsEditorSignal ||
      openCommitmentsEditorSignal <= lastCommitmentsEditorSignalRef.current
    ) {
      return
    }
    if (!commitmentsHydrated || loading) return
    lastCommitmentsEditorSignalRef.current = openCommitmentsEditorSignal
    setCommitmentsListExpanded(true)
    openCommitModal()
  }, [openCommitmentsEditorSignal, commitmentsHydrated, loading, openCommitModal])

  const addCommitModalRow = () => {
    const d = 15
    setCommitModalRows((r) => [
      ...r,
      {
        id: newId(),
        title: "",
        category: "",
        subcategory: "",
        dueDay: d,
        date: isoDateInMonth(month || new Date().toISOString().slice(0, 7), d),
        amount: 0,
        flowType: "fixed",
        _isNew: true,
      },
    ])
  }

  const saveCommitModal = async () => {
    setCommitSaveErr(null)
    for (const row of commitModalRows) {
      const dd = row.dueDay ?? dayFromIso(row.date)
      if (!row.title.trim() || !Number.isFinite(dd) || dd < 1 || dd > 31) {
        setCommitSaveErr("Cada fila necesita título y día del mes (1–31).")
        return
      }
    }

    const currentIds = new Set(commitModalRows.map((r) => r.id))
    const toDelete = [...commitModalInitialIds].filter((id) => !currentIds.has(id))

    if (supabaseEnabled) {
      try {
        for (const id of toDelete) {
          const res = await financeApiDelete(
            `/api/orbita/finanzas/commitments?id=${encodeURIComponent(id)}`,
          )
          const json = (await res.json()) as { success?: boolean; error?: string }
          if (!res.ok || !json.success) {
            throw new Error(messageForHttpError(res.status, json.error, res.statusText))
          }
        }
        const qMonth = encodeURIComponent(month || new Date().toISOString().slice(0, 7))
        for (const row of commitModalRows) {
          const title = row.title.trim()
          const category = row.category.trim()
          const subcategory = (row.subcategory ?? "").trim()
          const due_day = row.dueDay ?? dayFromIso(row.date)
          const amount = Math.max(0, row.amount)
          const flowType = row.flowType
          if (row._isNew) {
            const res = await financeApiJson(`/api/orbita/finanzas/commitments?month=${qMonth}`, {
              method: "POST",
              body: { title, category, subcategory, due_day, amount, flow_type: flowType },
            })
            const json = (await res.json()) as {
              success?: boolean
              data?: { commitment?: FlowCommitment }
              error?: string
            }
            if (!res.ok || !json.success || !json.data?.commitment) {
              throw new Error(messageForHttpError(res.status, json.error, res.statusText))
            }
          } else {
            const res = await financeApiJson(`/api/orbita/finanzas/commitments?month=${qMonth}`, {
              method: "PATCH",
              body: {
                id: row.id,
                title,
                category,
                subcategory,
                due_day,
                amount,
                flow_type: flowType,
              },
            })
            const json = (await res.json()) as { success?: boolean; error?: string }
            if (!res.ok || !json.success) {
              throw new Error(messageForHttpError(res.status, json.error, res.statusText))
            }
          }
        }
        await load()
        setCommitOpen(false)
        onCommitmentsPersisted?.()
      } catch (e) {
        setCommitSaveErr(e instanceof Error ? e.message : "No se pudieron guardar los compromisos")
      }
    } else {
      const ym = month || new Date().toISOString().slice(0, 7)
      const cleaned: FlowCommitment[] = commitModalRows.map((row) => {
        const dueDay = row.dueDay ?? dayFromIso(row.date)
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          subcategory: row.subcategory ?? "",
          dueDay,
          date: isoDateInMonth(ym, dueDay),
          amount: row.amount,
          flowType: row.flowType,
        }
      })
      setCommitments(cleaned)
      writeFlowCommitmentsToLocalStorage(cleaned)
      setCommitOpen(false)
      onCommitmentsPersisted?.()
    }
  }

  return (
    <>
    <section className={cn("space-y-5 sm:space-y-6", bridgeHost && "hidden")} aria-hidden={bridgeHost}>
      <div className="min-w-0">
        <h2 className={financeSectionEyebrowClass}>Simulador de cash flow</h2>
        <p className={cn(financeModuleHeroTaglineClass, "mt-1 max-w-xl")}>
          Compromisos y métricas del escenario van en el mismo bloque; después parámetros y 7 meses. «Aplicar plan de pago»
          cierra el flujo para llevar el escenario a tus tarjetas.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-orbita-secondary">Cargando contexto de flujo…</p>
      ) : null}
      {err ? <p className="text-sm text-amber-800">Vista limitada: {err}</p> : null}

      <div id="capital-compromisos" className={cn(cashFlowMajorShellClass, "scroll-mt-24 overflow-hidden")}>
        <div className="flex w-full min-w-0 items-start justify-between gap-3 px-3 pt-3 sm:gap-4 sm:px-4 sm:pt-3.5">
          <button
            type="button"
            onClick={() => setCommitmentsListExpanded((v) => !v)}
            className="min-w-0 flex-1 touch-manipulation pb-3 text-left sm:pb-4"
            aria-expanded={commitmentsListExpanded}
            aria-controls="capital-compromisos-lista"
            aria-labelledby="capital-compromisos-heading"
          >
            <div className="flex items-center gap-1.5 text-orbita-primary">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              <span id="capital-compromisos-heading" className={financeSectionEyebrowClass}>
                Compromisos del mes (por día fijo)
              </span>
            </div>
            <p className="mt-1 text-xs text-orbita-secondary">
              {commitmentsListExpanded ? "Ocultar lista detallada." : "Desplegá para ver cada ítem por día."}
            </p>
            {!commitmentsListExpanded ? (
              <p className="mt-2 text-sm text-orbita-primary">
                <span className="font-semibold tabular-nums">{commitmentsSorted.length}</span> compromiso
                {commitmentsSorted.length === 1 ? "" : "s"}
                {" · "}
                Impacto neto lista:{" "}
                <span
                  className={`font-semibold tabular-nums ${netImpact30 >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {netImpact30 >= 0 ? "+" : "-"}${formatMoney(Math.abs(netImpact30))}
                </span>
              </p>
            ) : null}
          </button>
          <div className="flex shrink-0 items-center gap-1 pb-3 pt-0.5 sm:gap-2 sm:pb-4">
            <button
              type="button"
              onClick={openCommitModal}
              className="whitespace-nowrap text-[10px] font-semibold text-orbita-secondary underline decoration-orbita-border/80 underline-offset-2 hover:text-orbita-primary sm:text-[11px]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setCommitmentsListExpanded((v) => !v)}
              className="rounded-lg p-1 text-orbita-secondary hover:bg-orbita-surface-alt"
              aria-expanded={commitmentsListExpanded}
              aria-controls="capital-compromisos-lista"
              aria-label={commitmentsListExpanded ? "Colapsar lista de compromisos" : "Expandir lista de compromisos"}
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 sm:h-[18px] sm:w-[18px] ${commitmentsListExpanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {commitmentsListExpanded ? (
          <div
            id="capital-compromisos-lista"
            role="region"
            aria-labelledby="capital-compromisos-heading"
            className="border-t border-orbita-border px-2 pb-2 pt-2 sm:px-4 sm:pb-3 sm:pt-3"
          >
            <ul className="divide-y divide-orbita-border/70 lg:hidden">
              {commitmentsSorted.map((c) => {
                const inc = isIncomeCommitment(c)
                const cat = c.category.trim()
                const showCat = Boolean(cat)
                const sub = (c.subcategory ?? "").trim()
                const titleDiffers = c.title.trim().toLowerCase() !== cat.toLowerCase()
                return (
                  <li key={c.id} className="flex gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 shrink text-[10px] font-semibold tabular-nums leading-tight text-orbita-secondary">
                          <span className="text-orbita-primary">Día {c.dueDay ?? dayFromIso(c.date)}</span>
                          <span className="text-orbita-secondary"> · {formatCommitmentDayEn(c.date)}</span>
                        </p>
                        <p
                          className={`shrink-0 text-right text-[13px] font-bold leading-none tabular-nums ${inc ? "text-emerald-600" : "text-orbita-primary"}`}
                        >
                          {inc ? "+" : "-"}${formatMoney(c.amount)}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {showCat ? (
                          <p className="min-w-0 text-[12px] font-semibold leading-snug text-orbita-primary">
                            {cat}
                            {sub ? <span className="font-normal text-orbita-secondary"> › {sub}</span> : null}
                          </p>
                        ) : (
                          <p className="min-w-0 text-[12px] font-semibold leading-snug text-orbita-primary">{c.title}</p>
                        )}
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-1.5 py-0 text-[8px] font-semibold uppercase leading-none tracking-wide ${flowTypeBadgeClass(c.flowType)}`}
                        >
                          {FLOW_TYPE_OPTIONS.find((o) => o.value === c.flowType)?.label ?? c.flowType}
                        </span>
                      </div>
                      {showCat && titleDiffers ? (
                        <p className="mt-0.5 truncate text-[10px] leading-snug text-orbita-secondary">{c.title}</p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="hidden overflow-x-auto pt-2 lg:block">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-left text-[11px] sm:text-sm">
                <thead>
                  <tr className="border-b border-orbita-border text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary sm:text-[10px]">
                    <th className="w-[12%] py-1.5 pr-2 font-medium">Día</th>
                    <th className="w-[50%] py-1.5 pr-3 font-medium">Concepto</th>
                    <th className="w-[18%] py-1.5 pr-2 font-medium">Tipo</th>
                    <th className="w-[20%] py-1.5 pl-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {commitmentsSorted.map((c) => {
                    const inc = isIncomeCommitment(c)
                    const cat = c.category.trim()
                    const showCat = Boolean(cat)
                    const sub = (c.subcategory ?? "").trim()
                    const titleDiffers = c.title.trim().toLowerCase() !== cat.toLowerCase()
                    return (
                      <tr key={c.id} className="border-b border-orbita-border/70 last:border-0">
                        <td className="py-1.5 pr-2 align-top tabular-nums text-orbita-primary">
                          <span className="font-semibold">{c.dueDay ?? dayFromIso(c.date)}</span>
                          <span className="ml-1 block text-[10px] font-normal text-orbita-secondary sm:inline">
                            ({formatCommitmentDayEn(c.date)})
                          </span>
                        </td>
                        <td className="max-w-0 py-1.5 pr-3 align-top" title={showCat ? `${cat} ${sub}` : c.title}>
                          {showCat ? (
                            <>
                              <p className="break-words font-semibold leading-snug text-orbita-primary">
                                {cat}
                                {sub ? <span className="font-normal text-orbita-secondary"> › {sub}</span> : null}
                              </p>
                              {titleDiffers ? (
                                <p className="mt-0.5 break-words text-[10px] leading-snug text-orbita-secondary">
                                  {c.title}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <p className="break-words font-semibold leading-snug text-orbita-primary">{c.title}</p>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 align-top">
                          <span
                            className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${flowTypeBadgeClass(c.flowType)}`}
                          >
                            <span className="truncate">
                              {FLOW_TYPE_OPTIONS.find((o) => o.value === c.flowType)?.label ?? c.flowType}
                            </span>
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap py-1.5 pl-2 text-right align-top text-[11px] font-bold tabular-nums sm:text-sm ${inc ? "text-emerald-600" : "text-orbita-primary"}`}
                        >
                          {inc ? "+" : "-"}${formatMoney(c.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="border-t border-orbita-border px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {[
              { k: "Obligaciones mensuales", v: formatMoney(fixedWithSubs), sub: "Fijos + suscripciones (sim.)" },
              { k: "Total gastos", v: formatMoney(totalGastosMes), sub: "Variables y ahorro incl." },
              {
                k: "Disponible",
                v: `${disponible < 0 ? "-" : ""}${formatMoney(Math.abs(disponible))}`,
                sub: "Tras escenario",
                tone: disponible >= 0 ? "text-emerald-700" : "text-rose-600",
              },
              {
                k: "Impacto mensual",
                v: `${netImpact30 >= 0 ? "+" : "-"}${formatMoney(Math.abs(netImpact30))}`,
                sub: "Lista de compromisos",
                tone: netImpact30 >= 0 ? "text-emerald-700" : "text-rose-600",
              },
            ].map((c) => (
              <div key={c.k} className={cashFlowKpiTileClass}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-orbita-secondary sm:text-[10px] sm:tracking-[0.12em]">
                  {c.k}
                </p>
                <p className={`mt-1.5 text-base font-bold tabular-nums sm:mt-2 sm:text-lg ${c.tone ?? "text-orbita-primary"}`}>
                  ${c.v}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-orbita-secondary sm:text-[11px]">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(cashFlowMajorShellClass, "overflow-hidden")}>
        <button
          type="button"
          onClick={() => setSimulatorExpanded((v) => !v)}
          className="flex w-full touch-manipulation items-start justify-between gap-3 p-3.5 text-left sm:p-5"
          aria-expanded={simulatorExpanded}
          aria-controls="capital-flujo-simulador-panel"
          aria-labelledby="capital-flujo-simulador-heading"
        >
          <div className="min-w-0">
            <p id="capital-flujo-simulador-heading" className={financeSectionEyebrowClass}>
              Parámetros y proyección de flujo
            </p>
            <p className={cn(financeModuleHeroTaglineClass, "mt-1 max-w-[min(100%,40rem)]")}>
              Ajustá ingresos y gastos del escenario y revisá siete meses adelante (tabla o barras).
            </p>
            {!simulatorExpanded ? (
              <p className="mt-2 text-sm text-orbita-primary">
                Ingresos est.{" "}
                <span className="font-semibold tabular-nums">${formatMoney(ingresosEstimados)}</span>
                {" · "}
                Disponible{" "}
                <span
                  className={`font-semibold tabular-nums ${disponible >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {disponible < 0 ? "-" : ""}${formatMoney(Math.abs(disponible))}
                </span>
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-orbita-secondary transition-transform duration-200 ${simulatorExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {simulatorExpanded ? (
          <div
            id="capital-flujo-simulador-panel"
            role="region"
            aria-labelledby="capital-flujo-simulador-heading"
            className="p-3 sm:p-4"
          >
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <div className="order-2 space-y-3 touch-manipulation sm:space-y-4 lg:order-1">
          <div className={cashFlowScenarioStackClass}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Ingresos del escenario
            </p>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary">Base mensual</p>
                  <p className="text-lg font-bold tabular-nums text-orbita-primary sm:text-xl">${formatMoney(incomeBase)}</p>
                </div>
                <div className="text-right text-[10px] text-orbita-secondary sm:text-[11px]">
                  <p className="leading-tight">Hist. 12m</p>
                  <p className="font-semibold tabular-nums text-orbita-primary">${formatMoney(incomeHistoricalAvg)}</p>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-orbita-secondary sm:text-[11px]">
                Tendencia ~{trendFromHistory >= 0 ? "+" : ""}
                {Math.round(trendFromHistory * 10) / 10}%
              </p>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-medium text-orbita-primary sm:text-xs">
                <span>Ajuste ingresos</span>
                <span className="tabular-nums text-orbita-primary">
                  {ingresosAdjustPct >= 0 ? "+" : ""}
                  {ingresosAdjustPct}%
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={22}
                value={ingresosAdjustPct}
                onChange={(e) => setIngresosAdjustPct(Number(e.target.value))}
                className="mt-1.5 h-9 w-full cursor-pointer accent-[var(--color-accent-primary)] sm:h-8"
              />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary">Ingresos estimados</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-orbita-primary sm:text-2xl">
                ${formatMoney(ingresosEstimados)}
              </p>
              <p className="mt-0.5 text-[10px] text-orbita-secondary sm:text-[11px]">
                vs base {variacionVsBasePct >= 0 ? "+" : ""}
                {variacionVsBasePct}%
              </p>
            </div>
          </div>

          <div className={cashFlowScenarioStackClass}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Gastos del escenario
            </p>
            <div className="space-y-3 sm:space-y-3.5">
              <label className="block text-[11px] font-medium text-orbita-primary sm:text-xs">
                Gastos fijos
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 min-h-11 w-full rounded-lg border border-orbita-border bg-orbita-surface px-2.5 py-2 text-sm tabular-nums shadow-inner sm:min-h-10 sm:py-1.5 sm:text-sm"
                  value={gastosFijos || ""}
                  onChange={(e) => setGastosFijos(Number(e.target.value))}
                />
                <span className="mt-0.5 block text-[10px] text-orbita-secondary">
                  + Suscripciones (sim.): ${formatMoney(subscriptionFixedMonthly)}
                </span>
              </label>
              <label className="block text-[11px] font-medium text-orbita-primary sm:text-xs">
                Variables
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 min-h-11 w-full rounded-lg border border-orbita-border bg-orbita-surface px-2.5 py-2 text-sm tabular-nums shadow-inner sm:min-h-10 sm:py-1.5 sm:text-sm"
                  value={gastosVariables || ""}
                  onChange={(e) => setGastosVariables(Number(e.target.value))}
                />
              </label>
              <label className="block text-[11px] font-medium text-orbita-primary sm:text-xs">
                Ahorro mensual
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1 min-h-11 w-full rounded-lg border border-orbita-border bg-orbita-surface px-2.5 py-2 text-sm tabular-nums shadow-inner sm:min-h-10 sm:py-1.5 sm:text-sm"
                  value={ahorroObjetivo || ""}
                  onChange={(e) => setAhorroObjetivo(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="order-1 space-y-2.5 lg:order-2 sm:space-y-3">
          <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-3">
            <p className={cn(financeSectionEyebrowClass, "min-w-0 flex-1 truncate")}>Vista por mes · 7 meses</p>
            <div className="flex shrink-0 rounded-full border border-orbita-border bg-orbita-surface-alt/80 p-0.5 text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
              <button
                type="button"
                onClick={() => setFlowViz("table")}
                className={`rounded-full px-3 py-1.5 transition ${flowViz === "table" ? "bg-orbita-surface text-orbita-primary shadow-sm" : "text-orbita-secondary"}`}
              >
                Tabla clara
              </button>
              <button
                type="button"
                onClick={() => setFlowViz("bars")}
                className={`rounded-full px-3 py-1.5 transition ${flowViz === "bars" ? "bg-orbita-surface text-orbita-primary shadow-sm" : "text-orbita-secondary"}`}
              >
                Barras comparadas
              </button>
            </div>
          </div>

          <div className={cashFlowProjectionWellClass}>
            {flowViz === "table" ? (
              <div className="max-h-[min(72vh,560px)] space-y-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
                {pipelineMonths.map((row) => {
                  const netPos = row.net >= 0
                  const total = row.ing + row.egr
                  const wIng = total > 0 ? Math.round((row.ing / total) * 100) : 50
                  const wEgr = 100 - wIng
                  return (
                    <div
                      key={row.ym}
                      className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_72%,var(--color-background))] px-3 py-3 shadow-sm sm:px-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-orbita-primary">{row.label}</span>
                        <span className={`text-sm font-bold tabular-nums ${netPos ? "text-emerald-600" : "text-rose-600"}`}>
                          Neto {netPos ? "+" : ""}${formatMoney(row.net)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_52%,var(--color-background))] px-2.5 py-2 shadow-inner">
                          <dt className="font-medium text-orbita-secondary">Entradas estimadas</dt>
                          <dd className="mt-0.5 font-bold tabular-nums text-orbita-primary">${formatMoney(row.ing)}</dd>
                        </div>
                        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_52%,var(--color-background))] px-2.5 py-2 shadow-inner">
                          <dt className="font-medium text-orbita-secondary">Salidas estimadas</dt>
                          <dd className="mt-0.5 font-bold tabular-nums text-orbita-primary">${formatMoney(row.egr)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-orbita-secondary">
                          Proporción del mes (entradas vs salidas)
                        </p>
                        <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-orbita-surface-alt">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${wIng}%` }}
                            title={`Entradas ${wIng}%`}
                          />
                          <div
                            className="h-full bg-gradient-to-l from-rose-500 to-rose-400 transition-all duration-500"
                            style={{ width: `${wEgr}%` }}
                            title={`Salidas ${wEgr}%`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
                <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:space-y-5 sm:overflow-visible sm:pr-0">
                  {pipelineMonths.map((row) => {
                    const wIng = Math.round((row.ing / maxBar) * 100)
                    const wEgr = Math.round((row.egr / maxBar) * 100)
                    const netPos = row.net >= 0
                    return (
                      <div key={row.ym} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-orbita-primary">
                          <span>{row.label}</span>
                          <span className={netPos ? "text-emerald-600" : "text-rose-600"}>
                            Neto {netPos ? "+" : ""}${formatMoney(row.net)}
                          </span>
                        </div>
                        <div className="relative flex h-14 items-center gap-1.5 sm:h-12 sm:gap-2">
                          <div
                            className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_42%,var(--color-background))] sm:h-10"
                            title={`Entradas ${formatMoney(row.ing)}`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm transition-all duration-500"
                              style={{ width: `${Math.min(100, wIng)}%` }}
                            />
                          </div>
                          <div
                            className="flex w-[3.25rem] flex-shrink-0 flex-col items-center justify-center rounded-xl border border-orbita-border bg-orbita-surface px-0.5 py-1 text-[9px] font-bold leading-tight text-orbita-primary shadow-sm sm:w-14 sm:px-1 sm:text-[10px]"
                            title={`Flujo neto ${formatMoney(row.net)}`}
                          >
                            <TrendingUp
                              className={`mb-0.5 h-3.5 w-3.5 ${netPos ? "text-emerald-600" : "text-rose-500 rotate-180"}`}
                            />
                            {netPos ? "↑" : "↓"}
                          </div>
                          <div
                            className="flex h-11 min-w-0 flex-1 items-center justify-end overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_42%,var(--color-background))] sm:h-10"
                            title={`Salidas ${formatMoney(row.egr)}`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-rose-500 to-rose-400 shadow-sm transition-all duration-500"
                              style={{ width: `${Math.min(100, wEgr)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between gap-2 text-[10px] font-medium text-orbita-secondary">
                          <span className="text-orbita-secondary">Entradas ${formatMoney(row.ing)}</span>
                          <span className="text-orbita-secondary">Salidas ${formatMoney(row.egr)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
            )}
          </div>
        </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex w-full justify-stretch pt-2 sm:justify-end sm:pt-4">
        <button
          type="button"
          onClick={onApplyPaymentPlan}
          className="min-h-9 w-full touch-manipulation rounded-full border-[0.5px] border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 hover:bg-rose-100 active:bg-rose-200 sm:w-auto sm:min-h-0"
        >
          Aplicar plan de pago
        </button>
      </div>
    </section>

      <CuentasModalShell
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
        title="Compromisos"
        subtitle="Día fijo cada mes, categoría y monto. Una fila por ítem."
        wide
        compact
      >
        <div className="max-h-[min(70vh,480px)] overflow-y-auto overflow-x-hidden md:max-h-[min(78vh,520px)]">
          <div className="space-y-2 md:hidden">
            {commitModalRows.map((row) => (
              <CommitmentModalMobileCard
                key={row.id}
                row={row}
                month={month}
                supabaseEnabled={supabaseEnabled}
                catalogSelectOpts={commitmentCatalogSelectOpts}
                setCommitModalRows={setCommitModalRows}
              />
            ))}
          </div>

          <div className="hidden md:block md:overflow-x-hidden">
            <table className="w-full table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
            <thead className="sticky top-0 z-[1] border-b border-orbita-border/70 bg-[color-mix(in_srgb,var(--color-surface-alt)_92%,var(--color-surface))]">
              <tr className="text-[8px] font-medium uppercase tracking-[0.06em] text-orbita-muted sm:text-[9px]">
                <th className="w-[8%] px-1 py-1 font-medium">Día</th>
                <th className="w-[22%] px-1 py-1 font-medium">Título</th>
                <th className="w-[26%] px-1 py-1 font-medium">Subcat.</th>
                <th className="w-[18%] px-1 py-1 font-medium">Tipo</th>
                <th className="w-[14%] px-1 py-1 font-medium">$</th>
                <th className="w-[8%] px-0 py-1" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {commitModalRows.map((row) => (
                <tr key={row.id} className="border-b border-orbita-border/40 align-top last:border-0">
                  <td className="px-1 py-0.5">
                    <select
                      className="h-7 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:h-8 sm:text-[11px]"
                      value={row.dueDay ?? dayFromIso(row.date)}
                      onChange={(e) => {
                        const d = Number(e.target.value)
                        setCommitModalRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  dueDay: d,
                                  date: isoDateInMonth(month || new Date().toISOString().slice(0, 7), d),
                                }
                              : r,
                          ),
                        )
                      }}
                    >
                      {COMMITMENT_DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-0 overflow-hidden px-1 py-0.5">
                    <input
                      className="h-7 w-full min-w-0 truncate rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[10px] text-orbita-primary placeholder:text-orbita-muted sm:h-8 sm:px-1.5 sm:text-[11px]"
                      placeholder="Concepto"
                      title={row.title}
                      value={row.title}
                      onChange={(e) =>
                        setCommitModalRows((rs) =>
                          rs.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)),
                        )
                      }
                    />
                  </td>
                  <td className="max-w-0 overflow-hidden px-1 py-0.5">
                    {supabaseEnabled && commitmentCatalogSelectOpts.length > 0 ? (
                      <div className="min-w-0 space-y-0.5">
                        <select
                          className="h-7 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:h-8 sm:px-1 sm:text-[11px]"
                          value={
                            row.category.trim() || row.subcategory.trim()
                              ? encodeCatPair(row.category, row.subcategory)
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            const { category, subcategory } = v ? decodeCatPair(v) : { category: "", subcategory: "" }
                            setCommitModalRows((rs) =>
                              rs.map((r) => (r.id === row.id ? { ...r, category, subcategory } : r)),
                            )
                          }}
                          title={row.category.trim() ? row.category : undefined}
                        >
                          <option value="">— Subcategoría —</option>
                          {commitmentCatalogSelectOpts.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {row.category.trim() ? (
                          <p className="truncate text-[9px] leading-tight text-orbita-muted sm:text-[10px]">
                            Cat.: {row.category.trim()}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <input
                          className="h-7 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1.5 text-[10px] text-orbita-primary sm:h-8 sm:text-[11px]"
                          placeholder="Categoría"
                          value={row.category}
                          onChange={(e) =>
                            setCommitModalRows((rs) =>
                              rs.map((r) => (r.id === row.id ? { ...r, category: e.target.value } : r)),
                            )
                          }
                        />
                        <input
                          className="h-7 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1.5 text-[10px] text-orbita-primary sm:h-8 sm:text-[11px]"
                          placeholder="Subcategoría"
                          value={row.subcategory ?? ""}
                          onChange={(e) =>
                            setCommitModalRows((rs) =>
                              rs.map((r) => (r.id === row.id ? { ...r, subcategory: e.target.value } : r)),
                            )
                          }
                        />
                      </div>
                    )}
                  </td>
                  <td className="max-w-0 overflow-hidden px-1 py-0.5">
                    <select
                      className="h-7 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:h-8 sm:px-1 sm:text-[11px]"
                      value={row.flowType}
                      onChange={(e) =>
                        setCommitModalRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, flowType: e.target.value as CommitmentFlowType }
                              : r,
                          ),
                        )
                      }
                    >
                      {FLOW_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="h-7 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[10px] tabular-nums text-orbita-primary sm:h-8 sm:px-1.5 sm:text-[11px]"
                      value={row.amount || ""}
                      onChange={(e) =>
                        setCommitModalRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id ? { ...r, amount: Math.max(0, Number(e.target.value)) } : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-0 py-0.5 text-center">
                    <button
                      type="button"
                      className="inline-flex rounded-md p-1 text-orbita-muted transition hover:bg-orbita-surface-alt hover:text-rose-600"
                      aria-label="Quitar fila"
                      onClick={() => setCommitModalRows((rs) => rs.filter((r) => r.id !== row.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        {commitSaveErr ? <p className="mt-2 text-[11px] leading-snug text-rose-600 sm:text-xs">{commitSaveErr}</p> : null}
        {supabaseEnabled ? (
          <p className="mt-1.5 text-[10px] text-orbita-muted sm:text-[11px]">Supabase · hogar.</p>
        ) : null}
        <div className="mt-3 flex flex-col gap-2 border-t border-orbita-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addCommitModalRow}
            className="h-9 touch-manipulation rounded-md border border-orbita-border/80 bg-orbita-surface px-3 text-xs font-medium text-orbita-primary hover:bg-orbita-surface-alt sm:h-9 sm:px-3.5"
          >
            + Fila
          </button>
          <button
            type="button"
            onClick={() => void saveCommitModal()}
            className="h-9 touch-manipulation rounded-md bg-orbita-primary px-4 text-xs font-semibold text-white hover:opacity-95 sm:px-5"
          >
            Guardar
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-orbita-muted sm:text-[11px]">
          Impacto lista: {netImpact30 >= 0 ? "+" : "-"}${formatMoney(Math.abs(netImpact30))} / mes.
        </p>
      </CuentasModalShell>
    </>
  )
}
