"use client"

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useFinance } from "../FinanceContext"
import { FinanceViewHeader } from "../_components/FinanceViewHeader"
import {
  financeCardMicroLabelClass,
  financeHeroChipBaseClass,
  financeInlineSegmentRailClass,
  financeModuleContentStackClass,
  financeModulePageBodyClass,
  financeNoticeChipClass,
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
  financeSubnavTabClass,
} from "../_components/financeChrome"
import { useRouter } from "next/navigation"
import { Card } from "@/src/components/ui/Card"
import { isModuloFinancieroStructuralCategory } from "@/lib/finanzas/structuralOperativoTotals"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { sheetTipoPillClass } from "@/lib/finanzas/catalogTagStyles"
import { applyClientCategoryBudgets, type CategoryBudgetSource } from "@/lib/finanzas/applyClientCategoryBudgets"
import {
  applyBudgetTemplateFromRemote,
  categoryBudgetKey,
  loadBudgetStore,
  loadMonthBudgets,
  markBudgetRemoteSynced,
  saveMonthBudgets,
  shouldApplyRemotePull,
  subcategoryBudgetKey,
  type MonthCategoryBudgetsV1,
} from "@/lib/finanzas/categoryBudgetStorage"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { CategoryAnalysisPanels } from "./_components/CategoryAnalysisPanels"
import { cn } from "@/lib/utils"

interface Subcategory {
  name: string
  total: number
  sheetTipo?: "fijo" | "variable" | "modulo_finanzas"
  financialImpact?: string
  budgetable?: boolean
  catalogCategory?: string
  categoryMismatch?: boolean
  /** Presupuesto en COP (solo si el usuario lo definió en «Presupuestos del mes»). */
  budgetCap?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
}

interface Category {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  delta?: number
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
  budgetSource?: CategoryBudgetSource
  subcategories?: Subcategory[]
}

interface CategoriesData {
  structuralCategories?: Category[]
  totalFixed?: number
  totalVariable?: number
  totalStructural?: number
  unknownSubcategories?: string[]
  subcategoryCatalog?: FinanceSubcategoryCatalogRow[]
}

interface CategoriesResponse {
  success: boolean
  data?: CategoriesData
  error?: string
}

function parseMoneyInput(s: string): number | null {
  const d = s.replace(/[^\d]/g, "")
  if (!d) return null
  const n = parseInt(d, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function budgetBarTone(status: Category["budgetStatus"]) {
  if (status === "red") return "bg-rose-500"
  if (status === "yellow") return "bg-amber-500"
  return "bg-emerald-500"
}

function OperativaCategoryCard({
  cat,
  onViewMovements,
}: {
  cat: Category
  onViewMovements: (name: string) => void
}) {
  const pillTipo = cat.type === "fixed" ? "fijo" : "variable"
  const typeLabel = cat.type === "fixed" ? "Fijo" : "Variable"
  const subCount = cat.subcategories?.length ?? 0
  const accent =
    cat.type === "fixed"
      ? "from-[color-mix(in_srgb,var(--color-accent-finance)_42%,transparent)] via-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)]"
      : "from-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] via-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]"

  return (
    <Card
      className="relative overflow-hidden p-0 transition-shadow hover:shadow-[0_10px_36px_color-mix(in_srgb,var(--color-text-primary)_8%,transparent)]"
      style={{
        background:
          "linear-gradient(168deg, color-mix(in srgb, var(--color-surface-alt) 52%, var(--color-surface)) 0%, var(--color-surface) 45%)",
        border: "0.5px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
        boxShadow: "0 2px 16px color-mix(in srgb, var(--color-text-primary) 5%, transparent)",
      }}
    >
      <div className={`h-0.5 w-full bg-gradient-to-r ${accent} to-transparent`} aria-hidden />
      <div className="grid gap-2.5 p-3 text-left sm:gap-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-[15px] font-semibold leading-snug tracking-tight text-orbita-primary">
                {cat.name}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${sheetTipoPillClass(pillTipo)}`}
              >
                {typeLabel}
              </span>
            </div>
            {cat.delta !== undefined ? (
              <p className={`mt-1 text-[10px] font-medium ${cat.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {cat.delta > 0 ? "+" : ""}
                {cat.delta.toFixed(0)} vs mes anterior
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular-nums text-lg font-semibold tracking-tight text-orbita-primary">
              ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </p>
            <button
              type="button"
              onClick={() => onViewMovements(cat.name)}
              className="mt-1 inline-flex rounded-full border border-orbita-border/40 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary transition hover:border-orbita-border/65 hover:text-orbita-primary"
            >
              Ver movimientos
            </button>
          </div>
        </div>

        {cat.budget && cat.budget > 0 && (
          <div className="grid gap-1.5 rounded-xl border border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-orbita-secondary">
              <span className="font-medium">Presupuesto</span>
              <span className="tabular-nums font-semibold text-orbita-primary">{cat.budgetUsedPercent?.toFixed(0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,transparent)] ring-1 ring-orbita-border/25">
              <div
                className={`${budgetBarTone(cat.budgetStatus)} h-full rounded-full transition-[width]`}
                style={{ width: `${Math.min(cat.budgetUsedPercent || 0, 100)}%` }}
              />
            </div>
            <p className="text-[9px] leading-tight text-orbita-secondary/90">
              Tope mensual ${cat.budget.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP.{" "}
              {cat.budgetSource === "manual"
                ? "Definido en la fila de esta categoría en «Presupuestos del mes»."
                : cat.budgetSource === "subs"
                  ? "Suma de los topes que pusiste en las subcategorías de esta categoría."
                  : "Sin tope en categoría ni subs: estimación automática (≈108% del gasto → ~93% usado)."}
            </p>
          </div>
        )}

        {cat.subcategories && subCount > 0 ? (
          <details className="group border-t border-orbita-border/50 pt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                Subcategorías ({subCount})
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-orbita-secondary transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-2 grid gap-2">
              {cat.subcategories.map((sub, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-orbita-border/30 bg-[color-mix(in_srgb,var(--color-text-primary)_2.5%,transparent)] px-2 py-1.5"
                >
                  <div className="flex min-w-0 flex-col gap-0.5 text-xs sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="break-words font-medium text-orbita-primary">{sub.name}</span>
                      {sub.categoryMismatch && sub.catalogCategory ? (
                        <p
                          className="mt-0.5 text-[9px] text-amber-800 dark:text-amber-300"
                          title="La categoría del movimiento no coincide con la del catálogo"
                        >
                          Cat. catálogo: {sub.catalogCategory}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-orbita-primary sm:text-right">
                      ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {sub.budgetCap != null && sub.budgetCap > 0 && sub.budgetUsedPercent != null ? (
                    <div className="mt-1.5 grid gap-1">
                      <div className="flex items-center justify-between text-[9px] text-orbita-secondary">
                        <span>Sub presupuesto</span>
                        <span className="tabular-nums font-medium text-orbita-primary">{sub.budgetUsedPercent}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)]">
                        <div
                          className={`${budgetBarTone(sub.budgetStatus)} h-full`}
                          style={{ width: `${Math.min(sub.budgetUsedPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  )
}

const mockCategories: CategoriesData = {
  totalFixed: 6200000,
  totalVariable: 3800000,
  totalStructural: 10000000,
  structuralCategories: [
    {
      name: "Vivienda",
      type: "fixed",
      total: -3200000,
      delta: -4,
      budget: 3400000,
      budgetUsedPercent: 94,
      budgetStatus: "yellow",
      subcategories: [
        { name: "Arriendo", total: -2600000 },
        { name: "Servicios", total: -600000 },
      ],
    },
    {
      name: "Seguro & Salud",
      type: "fixed",
      total: -1800000,
      delta: 2,
      budget: 2000000,
      budgetUsedPercent: 90,
      budgetStatus: "green",
      subcategories: [
        { name: "Seguro médico", total: -1200000 },
        { name: "Suplementos", total: -600000 },
      ],
    },
    {
      name: "Operación",
      type: "variable",
      total: -2100000,
      delta: 8,
      budget: 2200000,
      budgetUsedPercent: 96,
      budgetStatus: "red",
      subcategories: [
        { name: "Software", total: -900000 },
        { name: "Servicios", total: -700000 },
        { name: "Freelance", total: -500000 },
      ],
    },
    {
      name: "Estilo de vida",
      type: "variable",
      total: -1700000,
      delta: -6,
      budget: 2000000,
      budgetUsedPercent: 85,
      budgetStatus: "green",
      subcategories: [
        { name: "Movilidad", total: -500000 },
        { name: "Entrenamiento", total: -400000 },
        { name: "Alimentación", total: -800000 },
      ],
    },
  ],
}

function formatBudgetTimestamp(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function FinanzasCategories() {
  const finance = useFinance()
  const router = useRouter()
  const [data, setData] = useState<CategoriesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"operativa" | "estrategica" | "predictiva">("operativa")
  const [notice, setNotice] = useState<string | null>(null)
  const [categoryQuery, setCategoryQuery] = useState("")

  const month_value = finance?.month
  const capitalEpoch = finance?.capitalDataEpoch ?? 0
  const [savingCatalogId, setSavingCatalogId] = useState<string | null>(null)
  const [newOverride, setNewOverride] = useState({
    subcategory: "",
    category: "",
    expense_type: "variable" as FinanceSubcategoryCatalogRow["expense_type"],
    financial_impact: "operativo",
  })
  const [creatingOverride, setCreatingOverride] = useState(false)
  const [budgetRevision, setBudgetRevision] = useState(0)
  const [budgetDraft, setBudgetDraft] = useState<MonthCategoryBudgetsV1>({
    version: 1,
    category: {},
    subcategory: {},
  })
  const [householdPushNeeded, setHouseholdPushNeeded] = useState(false)
  const [householdSaving, setHouseholdSaving] = useState(false)
  const [householdSyncHint, setHouseholdSyncHint] = useState<string | null>(null)

  const loadCategories = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!month_value) {
        setData(null)
        setLoading(false)
        setError(null)
        return
      }
      const quiet = opts?.quiet === true
      try {
        if (!quiet) {
          setLoading(true)
          setError(null)
        }

        const response = await financeApiGet(
          `/api/orbita/finanzas/categories?month=${encodeURIComponent(month_value)}`,
        )

        const json = (await response.json()) as CategoriesResponse & { notice?: string }

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setNotice(json.notice ?? null)
        setData(json.data ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        if (!quiet) {
          setError(errorMessage)
          setData(null)
        }
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [month_value, capitalEpoch],
  )

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (month_value) setBudgetDraft(loadMonthBudgets(month_value))
  }, [month_value, budgetRevision])

  useEffect(() => {
    if (!month_value || !isSupabaseEnabled() || isAppMockMode()) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await financeApiGet("/api/orbita/finanzas/category-budgets")
        const json = (await res.json()) as {
          success?: boolean
          data: { template: MonthCategoryBudgetsV1; updated_at: string } | null
          error?: string
        }
        if (!res.ok || !json.success || cancelled) return
        if (!json.data) return
        const local = loadBudgetStore()
        if (!shouldApplyRemotePull(local, json.data.updated_at)) return
        applyBudgetTemplateFromRemote(json.data.template, json.data.updated_at)
        setBudgetDraft(loadMonthBudgets(month_value))
        setBudgetRevision((x) => x + 1)
        setHouseholdPushNeeded(false)
        setHouseholdSyncHint("Sincronizado desde el hogar.")
      } catch {
        /* offline u error silencioso */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month_value, capitalEpoch])

  const pushBudgetsToHousehold = useCallback(async () => {
    if (!isSupabaseEnabled() || isAppMockMode()) {
      setHouseholdSyncHint("Activa la sincronización con cuenta para guardar en el hogar.")
      return
    }
    setHouseholdSaving(true)
    setHouseholdSyncHint(null)
    try {
      const store = loadBudgetStore()
      const res = await financeApiJson("/api/orbita/finanzas/category-budgets", {
        method: "POST",
        body: { template: store.template },
      })
      const json = (await res.json()) as {
        success?: boolean
        data?: { updated_at?: string }
        error?: string
      }
      if (!res.ok || !json.success || !json.data?.updated_at) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      markBudgetRemoteSynced(json.data.updated_at)
      setHouseholdPushNeeded(false)
      setBudgetRevision((r) => r + 1)
      setHouseholdSyncHint("Guardado en el hogar.")
    } catch (e) {
      setHouseholdSyncHint(e instanceof Error ? e.message : "No se pudo guardar en el hogar.")
    } finally {
      setHouseholdSaving(false)
    }
  }, [])

  const structuralCategoriesRaw = data?.structuralCategories ?? []

  const storedMonthBudgets = useMemo(() => {
    if (!month_value) return { version: 1 as const, category: {}, subcategory: {} }
    return loadMonthBudgets(month_value)
  }, [month_value, budgetRevision])

  const structuralCategoriesUi = useMemo(
    () => structuralCategoriesRaw.filter((c) => !isModuloFinancieroStructuralCategory(c)),
    [structuralCategoriesRaw],
  )

  const structuralWithBudgets = useMemo(
    () => applyClientCategoryBudgets(structuralCategoriesUi, storedMonthBudgets),
    [structuralCategoriesUi, storedMonthBudgets],
  )

  const budgetStoreSnapshot = useMemo(() => loadBudgetStore(), [budgetRevision])

  const commitCategoryBudget = useCallback((cat: Category, raw: string) => {
    if (!month_value) return
    const n = parseMoneyInput(raw)
    const key = categoryBudgetKey(cat.type, cat.name)
    const base = loadMonthBudgets(month_value)
    const next: MonthCategoryBudgetsV1 = {
      version: 1,
      category: { ...base.category },
      subcategory: { ...base.subcategory },
    }
    if (n == null || n <= 0) delete next.category[key]
    else next.category[key] = n
    saveMonthBudgets(month_value, next)
    setBudgetDraft(next)
    setBudgetRevision((r) => r + 1)
    if (isSupabaseEnabled() && !isAppMockMode()) {
      setHouseholdPushNeeded(true)
      setHouseholdSyncHint(null)
    }
  }, [month_value])

  const commitSubcategoryBudget = useCallback((cat: Category, subName: string, raw: string) => {
    if (!month_value) return
    const n = parseMoneyInput(raw)
    const key = subcategoryBudgetKey(cat.type, cat.name, subName)
    const base = loadMonthBudgets(month_value)
    const next: MonthCategoryBudgetsV1 = {
      version: 1,
      category: { ...base.category },
      subcategory: { ...base.subcategory },
    }
    if (n == null || n <= 0) delete next.subcategory[key]
    else next.subcategory[key] = n
    saveMonthBudgets(month_value, next)
    setBudgetDraft(next)
    setBudgetRevision((r) => r + 1)
    if (isSupabaseEnabled() && !isAppMockMode()) {
      setHouseholdPushNeeded(true)
      setHouseholdSyncHint(null)
    }
  }, [month_value])

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Cargando categorías...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[var(--radius-card)] border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-danger) 32%, var(--color-border))",
          color: "var(--color-accent-danger)",
        }}
      >
        <p className="font-semibold">Error al cargar categorías</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  const totalFixed = data?.totalFixed ?? 0
  const totalVariable = data?.totalVariable ?? 0
  const unknownSubcategories = data?.unknownSubcategories ?? []
  const householdCatalogRows = data?.subcategoryCatalog ?? []

  const moduloCategory = structuralCategoriesRaw.find((c) => isModuloFinancieroStructuralCategory(c))
  const moduloTotalAbs = moduloCategory ? Math.abs(moduloCategory.total) : 0
  const totalVariableUi = Math.max(0, totalVariable - moduloTotalAbs)
  const totalStructuralUi = totalFixed + totalVariableUi

  async function saveCatalogExpenseType(id: string, expense_type: FinanceSubcategoryCatalogRow["expense_type"]) {
    setSavingCatalogId(id)
    try {
      const res = await financeApiJson("/api/orbita/finanzas/subcategory-catalog", {
        method: "PATCH",
        body: { id, expense_type },
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo guardar")
      }
      await loadCategories({ quiet: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando catálogo")
    } finally {
      setSavingCatalogId(null)
    }
  }

  async function createHouseholdOverride(e: FormEvent) {
    e.preventDefault()
    if (!newOverride.subcategory.trim() || !newOverride.category.trim()) return
    setCreatingOverride(true)
    try {
      const res = await financeApiJson("/api/orbita/finanzas/subcategory-catalog", {
        method: "POST",
        body: {
          subcategory: newOverride.subcategory.trim(),
          category: newOverride.category.trim(),
          expense_type: newOverride.expense_type,
          financial_impact: newOverride.financial_impact,
        },
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "No se pudo crear la fila")
      }
      setNewOverride({
        subcategory: "",
        category: "",
        expense_type: "variable",
        financial_impact: "operativo",
      })
      await loadCategories({ quiet: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando fila")
    } finally {
      setCreatingOverride(false)
    }
  }

  const noExpenses = structuralCategoriesUi.length === 0 || totalStructuralUi === 0

  const q = categoryQuery.trim().toLowerCase()
  const matchesQuery = (cat: Category) => {
    if (!q) return true
    if (cat.name.toLowerCase().includes(q)) return true
    return (cat.subcategories ?? []).some((s) => s.name.toLowerCase().includes(q))
  }

  const fixedCategories = (structuralWithBudgets || [])
    .filter((c): c is Category => c?.type === "fixed" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralWithBudgets || [])
    .filter((c): c is Category => c?.type === "variable" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const fixedPct =
    Math.abs(totalStructuralUi) > 0
      ? Math.round((Math.abs(totalFixed) / Math.abs(totalStructuralUi)) * 100)
      : 0

  const navigateToTransactions = (categoryName: string) => {
    const p = new URLSearchParams()
    if (month_value) p.set("month", month_value)
    p.set("category", categoryName)
    router.push(`/finanzas/transactions?${p.toString()}`)
  }

  return (
    <div className={cn(financePlStackClass, financeModulePageBodyClass, financeModuleContentStackClass)}>
      <FinanceViewHeader
        kicker={
          viewMode === "operativa"
            ? "Catálogo"
            : viewMode === "estrategica"
              ? "Análisis"
              : "Forecast"
        }
        title={
          viewMode === "operativa"
            ? "Mapa de gasto"
            : viewMode === "estrategica"
              ? "Control estratégico por categorías"
              : "Lectura predictiva del flujo"
        }
        subtitle={
          viewMode === "operativa"
            ? "Fijo y variable; cada fila agrupa subcategorías con movimiento."
            : viewMode === "estrategica"
              ? "Crecimiento, gastos hormiga y distribución con insights accionables."
              : "Proyección de flujo y escenarios sobre tu capital operativo."
        }
        action={
          notice ? (
            <span className={financeNoticeChipClass} role="status">
              {notice}
            </span>
          ) : null
        }
      />

      <section className="space-y-3" aria-label="Vista y filtros">
        <div>
          <h2 className={financeSectionEyebrowClass}>Vista y filtros</h2>
          <p className={financeSectionIntroClass}>
            Cambia el modo para ver mapa operativo, análisis o lectura predictiva. El mes lo controla el hero de Capital.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {viewMode === "operativa" ? (
            <label className="grid min-w-0 max-w-full gap-1.5 sm:max-w-md sm:flex-1">
              <span className={financeCardMicroLabelClass}>Buscar categoría o subcategoría</span>
              <input
                type="search"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Ej. Hogar, Mercado…"
                className="min-h-11 w-full rounded-[var(--radius-button)] border border-orbita-border/80 bg-orbita-surface px-3 py-2 text-sm text-orbita-primary shadow-sm outline-none ring-offset-2 transition focus-visible:border-[color-mix(in_srgb,var(--color-accent-finance)_45%,var(--color-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]"
                aria-label="Filtrar categorías"
              />
            </label>
          ) : (
            <p className="min-w-0 flex-1 text-pretty text-[11px] leading-relaxed text-orbita-muted sm:max-w-xl sm:text-xs">
              Los enlaces de análisis abren Movimientos con filtro; úsame para bajar al detalle sin perder el mes
              seleccionado.
            </p>
          )}
          <div
            className={financeInlineSegmentRailClass}
            role="tablist"
            aria-label="Modo de vista de categorías"
          >
            {(["operativa", "estrategica", "predictiva"] as const).map((mode) => {
              const active = viewMode === mode
              const label =
                mode === "operativa" ? "Operativa" : mode === "estrategica" ? "Estratégica" : "Predictiva"
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewMode(mode)}
                  className={cn(financeSubnavTabClass(active, { subtle: true }), "min-h-9 flex-1 sm:min-h-8 sm:flex-none")}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <p className="m-0">
          <span
            className={cn(financeHeroChipBaseClass, "border-orbita-border/55 bg-orbita-surface-alt/60 text-orbita-secondary")}
          >
            Lectura mensual
          </span>
        </p>
      </section>

      {viewMode === "estrategica" && (
        <CategoryAnalysisPanels mode="estrategica" budgetRevision={budgetRevision} />
      )}

      {viewMode === "predictiva" && (
        <CategoryAnalysisPanels mode="predictiva" budgetRevision={budgetRevision} />
      )}

      {viewMode === "operativa" && q && fixedCategories.length === 0 && variableCategories.length === 0 ? (
        <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt px-4 py-6 text-center text-sm text-orbita-secondary">
          Ninguna categoría coincide con «{categoryQuery.trim()}». Prueba otro término o borra el filtro.
        </div>
      ) : null}

      {viewMode === "operativa" && (
        <div className="space-y-4">
          {noExpenses && (
            <div className="space-y-2 rounded-lg bg-orbita-surface-alt p-6 text-center">
              <p className="text-orbita-secondary">No hay gastos categorizados para este mes.</p>
              {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
            </div>
          )}

          {!noExpenses && unknownSubcategories.length > 0 && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: "color-mix(in srgb, var(--color-accent-finance) 35%, var(--color-border))",
                background: "color-mix(in srgb, var(--color-accent-finance) 8%, var(--color-surface))",
              }}
            >
              <p className="font-medium text-orbita-primary">
                Subcategorías sin fila en el catálogo (hoja Categorías / Supabase)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-orbita-secondary">
                {unknownSubcategories.slice(0, 12).join(" · ")}
                {unknownSubcategories.length > 12 ? ` · +${unknownSubcategories.length - 12} más` : ""}
              </p>
            </div>
          )}
          {!noExpenses && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card hover className="p-3 sm:p-5">
                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total operativo</p>
                    <p className="text-3xl font-semibold text-orbita-primary">
                      ${Math.abs(totalStructuralUi).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-orbita-secondary">
                      {fixedPct}% fijo / {100 - fixedPct}% variable
                    </p>
                  </div>
                </Card>
                <Card hover className="p-3 sm:p-5">
                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total fijo</p>
                    <p className="text-3xl font-semibold text-orbita-primary">
                      ${Math.abs(totalFixed).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-orbita-secondary">Base operativa</p>
                  </div>
                </Card>
                <Card hover className="p-3 sm:p-5">
                  <div className="grid gap-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total variable</p>
                    <p className="text-3xl font-semibold text-orbita-primary">
                      ${Math.abs(totalVariableUi).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-orbita-secondary">Espacio de ajuste</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                {(
                  [
                    { label: "Fijo" as const, items: fixedCategories },
                    { label: "Variable" as const, items: variableCategories },
                  ] as const
                ).map((group) => (
                    <div key={group.label} className="space-y-3">
                      <span
                        className={`inline-flex rounded-full border border-orbita-border/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${sheetTipoPillClass(group.label === "Fijo" ? "fijo" : "variable")}`}
                      >
                        {group.label}
                      </span>
                      {group.items.map((cat) => (
                        <OperativaCategoryCard
                          key={`${cat.name}-${cat.type}`}
                          cat={cat}
                          onViewMovements={navigateToTransactions}
                        />
                      ))}
                    </div>
                  ))}
              </div>
            </>
          )}

          <Card className="overflow-hidden p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-orbita-primary">Catálogo de tu hogar</h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary">
                    Sobrescrituras por subcategoría y tipo de gasto — desplegar para ver tabla y formulario.
                  </p>
                </div>
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-4 border-t border-orbita-border/70 bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            <p className="text-xs leading-relaxed text-orbita-secondary">
              Las filas globales (plantilla) no se editan aquí: crea una fila con el mismo nombre de subcategoría para
              tu hogar y elige <span className="font-medium">expense_type</span>. Usa{" "}
              <span className={`inline ${sheetTipoPillClass("modulo_finanzas")} px-1 py-0`}>Módulo finanzas</span> para
              excluir esos movimientos del gasto operativo y de este mapa (solo se listan categorías fijas y variables).
            </p>

            {householdCatalogRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-orbita-border text-orbita-secondary">
                      <th className="py-2 pr-2 font-medium">Subcategoría</th>
                      <th className="py-2 pr-2 font-medium">Categoría</th>
                      <th className="py-2 pr-2 font-medium">Tipo (expense_type)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {householdCatalogRows.map((row) => (
                      <tr key={row.id} className="border-b border-orbita-border/80">
                        <td className="py-2 pr-2 align-middle text-orbita-primary">{row.subcategory}</td>
                        <td className="py-2 pr-2 align-middle text-orbita-secondary">{row.category}</td>
                        <td className="py-2 align-middle">
                          <select
                            value={row.expense_type}
                            disabled={savingCatalogId === row.id}
                            onChange={(e) => {
                              const v = e.target.value as FinanceSubcategoryCatalogRow["expense_type"]
                              if (v === row.expense_type) return
                              void saveCatalogExpenseType(row.id, v)
                            }}
                            className="max-w-full rounded-md border border-orbita-border bg-orbita-surface px-2 py-1.5 text-orbita-primary"
                            aria-label={`Tipo para ${row.subcategory}`}
                          >
                            <option value="fijo">fijo</option>
                            <option value="variable">variable</option>
                            <option value="modulo_finanzas">modulo_finanzas</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-xs text-orbita-secondary">
                Aún no hay filas solo de tu hogar. Usa el formulario siguiente para sobrescribir una subcategoría de la
                plantilla (mismo texto de subcategoría).
              </p>
            )}

            <form onSubmit={createHouseholdOverride} className="mt-4 grid gap-3 border-t border-orbita-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wide text-orbita-secondary">Subcategoría</span>
                <input
                  value={newOverride.subcategory}
                  onChange={(e) => setNewOverride((s) => ({ ...s, subcategory: e.target.value }))}
                  className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-2 text-sm"
                  placeholder="Ej. Otros"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wide text-orbita-secondary">Categoría</span>
                <input
                  value={newOverride.category}
                  onChange={(e) => setNewOverride((s) => ({ ...s, category: e.target.value }))}
                  className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-2 text-sm"
                  placeholder="Ej. Ajustes"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wide text-orbita-secondary">expense_type</span>
                <select
                  value={newOverride.expense_type}
                  onChange={(e) =>
                    setNewOverride((s) => ({
                      ...s,
                      expense_type: e.target.value as FinanceSubcategoryCatalogRow["expense_type"],
                    }))
                  }
                  className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-2 text-sm"
                >
                  <option value="fijo">fijo</option>
                  <option value="variable">variable</option>
                  <option value="modulo_finanzas">modulo_finanzas</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wide text-orbita-secondary">financial_impact</span>
                <select
                  value={newOverride.financial_impact}
                  onChange={(e) => setNewOverride((s) => ({ ...s, financial_impact: e.target.value }))}
                  className="rounded-md border border-orbita-border bg-orbita-surface px-2 py-2 text-sm"
                >
                  <option value="operativo">operativo</option>
                  <option value="inversion">inversion</option>
                  <option value="transferencia">transferencia</option>
                  <option value="financiero">financiero</option>
                  <option value="ajuste">ajuste</option>
                </select>
              </label>
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  disabled={creatingOverride}
                  className="rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-orbita-primary disabled:opacity-50"
                >
                  {creatingOverride ? "Guardando…" : "Crear sobrescritura del hogar"}
                </button>
              </div>
            </form>
              </div>
            </details>
          </Card>

          <Card
            className="overflow-hidden p-0"
            style={{
              background:
                "linear-gradient(175deg, color-mix(in srgb, var(--color-surface-alt) 45%, var(--color-surface)) 0%, var(--color-surface) 55%)",
              border: "0.5px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
              boxShadow: "0 2px 18px color-mix(in srgb, var(--color-text-primary) 5%, transparent)",
            }}
          >
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-orbita-primary">Presupuestos (COP, lineal mensual)</h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary">
                    Mismo tope en COP para todos los meses (lineal). Las barras de «Presupuesto» usan estos montos; si
                    dejas vacío, se mantiene la estimación automática. Vista mes {month_value ?? "—"} como referencia de
                    gasto.
                  </p>
                </div>
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-3 border-t border-orbita-border/60 bg-[color-mix(in_srgb,var(--color-surface-alt)_32%,var(--color-surface))] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-[11px] leading-relaxed text-orbita-secondary">
                    <p>
                      Los cambios se guardan en este dispositivo al salir del campo (tab o clic fuera). Borra el tope y
                      confirma con tab o fuera para volver a la estimación automática.
                    </p>
                    <p className="tabular-nums text-orbita-primary">
                      Última modificación:{" "}
                      <span className="font-medium">{formatBudgetTimestamp(budgetStoreSnapshot.updatedAt)}</span>
                      {budgetStoreSnapshot.lastRemoteUpdatedAt ? (
                        <>
                          {" "}
                          · Hogar:{" "}
                          <span className="font-medium">
                            {formatBudgetTimestamp(budgetStoreSnapshot.lastRemoteUpdatedAt)}
                          </span>
                        </>
                      ) : null}
                    </p>
                    {householdPushNeeded && isSupabaseEnabled() && !isAppMockMode() ? (
                      <p className="text-amber-800 dark:text-amber-200">Cambios pendientes de subir al hogar.</p>
                    ) : null}
                    {householdSyncHint ? (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200">{householdSyncHint}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                    <button
                      type="button"
                      disabled={householdSaving || !isSupabaseEnabled() || isAppMockMode()}
                      onClick={() => void pushBudgetsToHousehold()}
                      className="rounded-[var(--radius-button)] border border-orbita-border/80 bg-orbita-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orbita-primary transition hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {householdSaving ? "Guardando…" : "Guardar en el hogar"}
                    </button>
                    {isSupabaseEnabled() && !isAppMockMode() ? (
                      <p className="max-w-[14rem] text-right text-[10px] text-orbita-secondary">
                        Replica la plantilla en la nube para todo el hogar (mismo COP cada mes).
                      </p>
                    ) : (
                      <p className="max-w-[14rem] text-right text-[10px] text-orbita-secondary">
                        Activa la sincronización con cuenta para guardar también en el hogar.
                      </p>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-orbita-border/45">
                  <table className="w-full min-w-[min(100%,560px)] border-collapse text-left text-[11px]">
                    <thead>
                      <tr
                        className="border-b border-orbita-border/60 text-orbita-secondary"
                        style={{
                          background: "color-mix(in srgb, var(--color-surface-alt) 88%, var(--color-surface))",
                        }}
                      >
                        <th className="px-2 py-2 font-semibold sm:px-3">Tipo</th>
                        <th className="px-2 py-2 font-semibold sm:px-3">Nombre</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">Gasto mes</th>
                        <th className="min-w-[8.5rem] px-2 py-2 font-semibold sm:px-3">Tope (COP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...structuralWithBudgets]
                        .filter((c) => Math.abs(c.total) > 0)
                        .sort((a, b) => {
                          const ta = a.type === "fixed" ? 0 : 1
                          const tb = b.type === "fixed" ? 0 : 1
                          if (ta !== tb) return ta - tb
                          return Math.abs(b.total) - Math.abs(a.total)
                        })
                        .flatMap((cat) => {
                          const ck = categoryBudgetKey(cat.type, cat.name)
                          const catRow = (
                            <tr key={`c-${ck}`} className="border-b border-orbita-border/40 bg-[color-mix(in_srgb,var(--color-text-primary)_2%,transparent)]">
                              <td className="px-2 py-2 align-middle sm:px-3">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${sheetTipoPillClass(cat.type === "fixed" ? "fijo" : "variable")}`}
                                >
                                  {cat.type === "fixed" ? "Fijo" : "Variable"}
                                </span>
                              </td>
                              <td className="px-2 py-2 align-middle font-medium text-orbita-primary sm:px-3">{cat.name}</td>
                              <td className="px-2 py-2 align-middle text-right tabular-nums text-orbita-secondary sm:px-3">
                                ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-2 py-2 align-middle sm:px-3">
                                <input
                                  key={`cat-inp-${ck}-${budgetRevision}`}
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Auto"
                                  defaultValue={
                                    budgetDraft.category[ck] != null ? String(budgetDraft.category[ck]) : ""
                                  }
                                  onBlur={(e) => commitCategoryBudget(cat, e.target.value)}
                                  className="w-full min-w-0 rounded-lg border border-orbita-border/50 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] px-2 py-1.5 text-xs tabular-nums text-orbita-primary outline-none ring-orbita-border/30 focus:border-orbita-border/80 focus:ring-1"
                                  aria-label={`Presupuesto categoría ${cat.name}`}
                                />
                              </td>
                            </tr>
                          )
                          const subRows = (cat.subcategories ?? []).map((sub) => {
                            const sk = subcategoryBudgetKey(cat.type, cat.name, sub.name)
                            return (
                              <tr
                                key={`s-${sk}`}
                                className="border-b border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-surface-alt)_22%,transparent)]"
                              >
                                <td className="px-2 py-1.5 sm:px-3" />
                                <td className="px-2 py-1.5 pl-4 text-orbita-secondary sm:px-3 sm:pl-6">
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-orbita-secondary/80">
                                    Sub
                                  </span>{" "}
                                  <span className="text-orbita-primary">{sub.name}</span>
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                                  ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-2 py-1.5 sm:px-3">
                                  <input
                                    key={`sub-inp-${sk}-${budgetRevision}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="—"
                                    defaultValue={
                                      budgetDraft.subcategory[sk] != null ? String(budgetDraft.subcategory[sk]) : ""
                                    }
                                    onBlur={(e) => commitSubcategoryBudget(cat, sub.name, e.target.value)}
                                    className="w-full min-w-0 rounded-lg border border-orbita-border/40 bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-2 py-1 text-[11px] tabular-nums text-orbita-primary outline-none focus:border-orbita-border/75 focus:ring-1"
                                    aria-label={`Presupuesto subcategoría ${sub.name}`}
                                  />
                                </td>
                              </tr>
                            )
                          })
                          return [catRow, ...subRows]
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </Card>
        </div>
      )}
    </div>
  )
}
