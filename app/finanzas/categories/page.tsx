"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useFinance } from "../FinanceContext"
import { useRouter } from "next/navigation"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financialImpactPillClass, sheetTipoPillClass } from "@/lib/finanzas/catalogTagStyles"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

interface Subcategory {
  name: string
  total: number
  sheetTipo?: "fijo" | "variable"
  financialImpact?: string
  budgetable?: boolean
  catalogCategory?: string
  categoryMismatch?: boolean
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
  subcategories?: Subcategory[]
}

interface CategoriesData {
  structuralCategories?: Category[]
  totalFixed?: number
  totalVariable?: number
  totalStructural?: number
  unknownSubcategories?: string[]
}

interface CategoriesResponse {
  success: boolean
  data?: CategoriesData
  error?: string
}

function OperativaCategoryCard({
  cat,
  onViewMovements,
}: {
  cat: Category
  onViewMovements: (name: string) => void
}) {
  const typeLabel = cat.type === "fixed" ? "Fijo" : "Variable"
  const subCount = cat.subcategories?.length ?? 0

  return (
    <Card hover className="p-3 sm:p-4">
      <div className="grid gap-2 text-left">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-semibold leading-snug text-orbita-primary">{cat.name}</p>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${sheetTipoPillClass(cat.type === "fixed" ? "fijo" : "variable")}`}
              >
                {typeLabel}
              </span>
            </div>
            {cat.delta !== undefined ? (
              <p className={`mt-0.5 text-[10px] ${cat.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {cat.delta > 0 ? "+" : ""}
                {cat.delta.toFixed(0)} vs mes anterior
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular-nums text-base font-semibold text-orbita-primary">
              ${Math.abs(cat.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
            </p>
            <button
              type="button"
              onClick={() => onViewMovements(cat.name)}
              className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-orbita-secondary hover:text-orbita-primary"
            >
              Ver movimientos
            </button>
          </div>
        </div>

        {cat.budget && cat.budget > 0 && (
          <div className="grid gap-1">
            <div className="flex items-center justify-between text-xs text-orbita-secondary">
              <span>Presupuesto</span>
              <span className="font-semibold text-orbita-primary">{cat.budgetUsedPercent?.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-orbita-surface-alt">
              <div
                className={`${
                  cat.budgetStatus === "red"
                    ? "bg-rose-500"
                    : cat.budgetStatus === "yellow"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                } h-full`}
                style={{ width: `${Math.min(cat.budgetUsedPercent || 0, 100)}%` }}
              />
            </div>
          </div>
        )}

        {cat.subcategories && subCount > 0 ? (
          <details className="group border-t border-orbita-border pt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
                Subcategorías ({subCount})
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-orbita-secondary transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-2 grid gap-1">
              {cat.subcategories.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex min-w-0 flex-col gap-0.5 text-xs sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="break-words text-orbita-secondary">{sub.name}</span>
                    {(sub.sheetTipo || sub.financialImpact != null) && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {sub.sheetTipo && (
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] uppercase tracking-wide ${sheetTipoPillClass(sub.sheetTipo)}`}
                          >
                            {sub.sheetTipo === "fijo" ? "Fijo" : "Variable"}
                          </span>
                        )}
                        {sub.financialImpact ? (
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] font-medium ${financialImpactPillClass(sub.financialImpact)}`}
                          >
                            {sub.financialImpact}
                          </span>
                        ) : null}
                        {sub.budgetable === false && (
                          <span className="rounded border border-dashed border-orbita-border px-1 py-0.5 text-[9px] text-orbita-secondary">
                            No presupuestable
                          </span>
                        )}
                        {sub.categoryMismatch && sub.catalogCategory && (
                          <span
                            className="rounded px-1 py-0.5 text-[9px] text-amber-800 dark:text-amber-300"
                            title="La categoría del movimiento no coincide con la del catálogo"
                          >
                            Cat. catálogo: {sub.catalogCategory}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-orbita-primary sm:text-right">
                    ${Math.abs(sub.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                  </span>
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
  useEffect(() => {
    if (!month_value) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)

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
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
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

  const structuralCategories = data?.structuralCategories ?? []
  const totalFixed = data?.totalFixed ?? 0
  const totalVariable = data?.totalVariable ?? 0
  const totalStructural = data?.totalStructural ?? 0
  const unknownSubcategories = data?.unknownSubcategories ?? []

  if (structuralCategories.length === 0 || totalStructural === 0) {
    return (
      <div className="space-y-2 p-6 text-center bg-orbita-surface-alt rounded-lg">
        <p className="text-orbita-secondary">No hay gastos categorizados para este mes.</p>
        {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
      </div>
    )
  }

  const q = categoryQuery.trim().toLowerCase()
  const matchesQuery = (cat: Category) => {
    if (!q) return true
    if (cat.name.toLowerCase().includes(q)) return true
    return (cat.subcategories ?? []).some((s) => s.name.toLowerCase().includes(q))
  }

  const fixedCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "fixed" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const variableCategories = (structuralCategories || [])
    .filter((c): c is Category => c?.type === "variable" && Math.abs(c.total) > 0)
    .filter(matchesQuery)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const fixedPct =
    Math.abs(totalStructural) > 0
      ? Math.round((Math.abs(totalFixed) / Math.abs(totalStructural)) * 100)
      : 0

  const navigateToTransactions = (categoryName: string) => {
    const p = new URLSearchParams()
    if (month_value) p.set("month", month_value)
    p.set("category", categoryName)
    router.push(`/finanzas/transactions?${p.toString()}`)
  }

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-orbita-primary">Mapa de gasto por categorías</h1>
          <p className="mt-1 text-sm text-orbita-secondary">
            Totales del mes en bloques fijos y variables; cada fila agrupa subcategorías con movimiento.
          </p>
        </div>
        {notice && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-800">
            {notice}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <label className="grid min-w-0 max-w-full gap-1.5 sm:max-w-md sm:flex-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Buscar categoría o subcategoría</span>
          <input
            type="search"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Ej. Hogar, Mercado…"
            className="min-h-11 w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary"
            aria-label="Filtrar categorías"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(["operativa", "estrategica", "predictiva"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`min-h-11 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition sm:min-h-0 ${
                viewMode === mode
                  ? "border-orbita-border bg-orbita-surface text-orbita-primary shadow-card"
                  : "border-transparent bg-orbita-surface-alt text-orbita-secondary hover:text-orbita-primary"
              }`}
            >
              {mode === "operativa" && "Operativa"}
              {mode === "estrategica" && "Estratégica"}
              {mode === "predictiva" && "Predictiva"}
            </button>
          ))}
        </div>
        <span className="text-xs text-orbita-secondary sm:shrink-0">Lectura mensual</span>
      </div>

      {viewMode === "estrategica" && (
        <Card className="p-4 sm:p-8">
          <div className="grid gap-2 text-center">
            <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Vista estratégica</p>
            <p className="text-sm text-orbita-secondary">En desarrollo…</p>
          </div>
        </Card>
      )}

      {viewMode === "predictiva" && (
        <Card className="p-4 sm:p-8">
          <div className="grid gap-2 text-center">
            <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Vista predictiva</p>
            <p className="text-sm text-orbita-secondary">En desarrollo…</p>
          </div>
        </Card>
      )}

      {viewMode === "operativa" && q && fixedCategories.length === 0 && variableCategories.length === 0 ? (
        <div className="rounded-xl border border-orbita-border bg-orbita-surface-alt px-4 py-6 text-center text-sm text-orbita-secondary">
          Ninguna categoría coincide con «{categoryQuery.trim()}». Prueba otro término o borra el filtro.
        </div>
      ) : null}

      {viewMode === "operativa" && (
        <div className="space-y-4">
          {unknownSubcategories.length > 0 && (
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card hover className="p-4 sm:p-8">
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total estructural</p>
                <p className="text-3xl font-semibold text-orbita-primary">
                  ${Math.abs(totalStructural).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-orbita-secondary">
                  {fixedPct}% fijo / {100 - fixedPct}% variable
                </p>
              </div>
            </Card>
            <Card hover className="p-4 sm:p-8">
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
            <Card hover className="p-4 sm:p-8">
              <div className="grid gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total variable</p>
                <p className="text-3xl font-semibold text-orbita-primary">
                  ${Math.abs(totalVariable).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-orbita-secondary">Espacio de ajuste</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {[{ label: "Fijo", items: fixedCategories }, { label: "Variable", items: variableCategories }].map((group) => (
              <div key={group.label} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-orbita-secondary">{group.label}</p>
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
        </div>
      )}
    </div>
  )
}
