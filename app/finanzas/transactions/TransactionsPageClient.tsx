"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { useFinance } from "../FinanceContext"
import {
  financeCardMicroLabelClass,
  financeHeroChipBaseClass,
  financeSectionEyebrowClass,
  financeViewRootClass,
} from "../_components/financeChrome"
import { useLedgerAccounts } from "../useLedgerAccounts"
import { Card } from "@/src/components/ui/Card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { ChevronDown, ListOrdered, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { financeApiDelete, financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { buildTransactionsExportCsv } from "@/lib/finanzas/transactionsCsv"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isReconciliationAdjustmentDescription(description: string | undefined): boolean {
  return /reconciliation_adjustment/i.test(String(description ?? ""))
}

/** Deja que el navegador pinte (p. ej. estado «Eliminando…») antes de un await largo — mejora INP. */
function yieldToNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** Separador improbable en nombres de categoría/subcategoría */
const CAT_SUB_SEP = "\u001f"

function pairKey(category: string, subcategory: string) {
  return `${category.trim()}${CAT_SUB_SEP}${subcategory.trim()}`
}

/** Pares únicos (categoría, subcategoría) del catálogo; la categoría queda determinada por la sub fila elegida. */
function catalogPairRows(rows: FinanceSubcategoryCatalogRow[]): { category: string; subcategory: string }[] {
  const m = new Map<string, { category: string; subcategory: string }>()
  for (const r of rows) {
    const c = r.category?.trim() ?? ""
    const s = r.subcategory?.trim() ?? ""
    if (!c || !s) continue
    const key = pairKey(c, s)
    if (!m.has(key)) m.set(key, { category: c, subcategory: s })
  }
  return [...m.values()].sort(
    (a, b) =>
      a.subcategory.localeCompare(b.subcategory, "es") || a.category.localeCompare(b.category, "es"),
  )
}

function pairsForRow(
  base: { category: string; subcategory: string }[],
  cat: string,
  sub: string,
): { category: string; subcategory: string }[] {
  const k = pairKey(cat, sub)
  if (base.some((p) => pairKey(p.category, p.subcategory) === k)) return base
  if (cat.trim() || sub.trim()) {
    return [{ category: cat.trim(), subcategory: sub.trim() }, ...base]
  }
  return base
}

const txSelectGhost =
  "w-full max-w-full cursor-pointer rounded-md border border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] py-1 pl-1.5 pr-6 text-[10px] font-medium text-orbita-primary shadow-none outline-none transition-[border-color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-primary)_8%,transparent)] focus:border-orbita-border/70 focus:bg-[color-mix(in_srgb,var(--color-surface-alt)_65%,transparent)] sm:text-[11px]"
const txSelectTipo =
  "w-full max-w-full cursor-pointer rounded-md border border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] py-0.5 pl-1 pr-5 text-[9px] font-semibold uppercase tracking-wide shadow-none outline-none transition hover:bg-[color-mix(in_srgb,var(--color-text-primary)_8%,transparent)] focus:border-orbita-border/70 sm:text-[10px]"
/** Selectores en filas móviles de movimientos: altura mínima táctil, menos padding vertical */
const txSelectMobileDense =
  "min-h-7 py-0 leading-tight [&>option]:text-[10px]"

/** Barra de filtros Movimientos: una fila, selects bajos y discretos */
const txFilterBarSelect =
  "min-h-7 h-7 min-w-0 cursor-pointer rounded-md border border-orbita-border/40 bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] px-2 py-0 pr-7 text-[11px] font-medium leading-none text-orbita-primary shadow-none outline-none transition-[border-color,background-color] hover:border-orbita-border/60 hover:bg-orbita-surface focus-visible:border-orbita-border/75 focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"

/** Pie KPI Movimientos: móvil en rejilla (icono | etiqueta | métrica a la derecha); sm+ fila flex */
const txStatCellShell =
  "min-w-0 py-2 motion-safe:transition-[transform] motion-safe:duration-200 sm:px-4 sm:py-1.5 motion-safe:hover:-translate-y-px motion-reduce:transform-none max-sm:grid max-sm:grid-cols-[2rem_minmax(0,1fr)_auto] max-sm:gap-x-2 max-sm:items-center sm:flex sm:items-start sm:gap-2.5"

interface Transaction {
  id?: string
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
  cuenta?: string
  monto: number
  tipo?: "income" | "expense"
}

interface TransactionsData {
  transactions: Transaction[]
  subtotal: number
  previousSubtotal: number
  delta: number | null
}

interface TransactionsResponse {
  success: boolean
  data?: TransactionsData
  error?: string
}

interface PatchTxResponse {
  success: boolean
  data?: { transaction?: Transaction }
  error?: string
}

export default function TransactionsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const finance = useFinance()
  const touchCapitalData = finance?.touchCapitalData

  const [data, setData] = useState<TransactionsData | null>(null)
  const [txRows, setTxRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patchErr, setPatchErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [catalogRows, setCatalogRows] = useState<FinanceSubcategoryCatalogRow[]>([])
  const catalogPairs = useMemo(() => catalogPairRows(catalogRows), [catalogRows])
  const [templateDownloading, setTemplateDownloading] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const [importSuccessDialog, setImportSuccessDialog] = useState<{
    open: boolean
    message: string
    omittedLines?: { line: number; message: string }[]
  }>({ open: false, message: "" })
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const selectAllRef = useRef<HTMLInputElement>(null)

  const month = finance?.month ?? searchParams.get("month") ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0
  const category = searchParams.get("category") || ""
  const subcategoryParam = searchParams.get("subcategory")?.trim() ?? ""

  const accountParam = searchParams.get("account")?.trim() ?? ""
  const financeAccountId = UUID_RE.test(accountParam) ? accountParam : ""

  const tipoParamRaw = searchParams.get("tipo")?.trim().toLowerCase() ?? ""
  const tipoFilterUrl: "" | "ingreso" | "gasto" =
    tipoParamRaw === "ingreso" || tipoParamRaw === "income"
      ? "ingreso"
      : tipoParamRaw === "gasto" || tipoParamRaw === "expense"
        ? "gasto"
        : ""

  const catalogCategories = useMemo(() => {
    const s = new Set<string>()
    for (const r of catalogRows) {
      const c = r.category?.trim()
      if (c) s.add(c)
    }
    const cur = category.trim()
    if (cur) s.add(cur)
    return [...s].sort((a, b) => a.localeCompare(b, "es"))
  }, [catalogRows, category])

  const { accounts: ledgerAccounts } = useLedgerAccounts({ enabled: supabaseEnabled })

  const loadTransactions = useCallback(
    async (opts: { showLoading: boolean }) => {
      if (!month) {
        setData(null)
        setTxRows([])
        return
      }

      if (opts.showLoading) {
        setLoading(true)
        setError(null)
      }

      try {
        let url = `/api/orbita/finanzas/transactions?month=${encodeURIComponent(month)}`
        if (category) {
          url += `&category=${encodeURIComponent(category)}`
        }
        if (subcategoryParam) {
          url += `&subcategory=${encodeURIComponent(subcategoryParam)}`
        }
        if (financeAccountId) {
          url += `&finance_account_id=${encodeURIComponent(financeAccountId)}`
        }
        if (tipoFilterUrl === "ingreso") {
          url += "&tipo=ingreso"
        } else if (tipoFilterUrl === "gasto") {
          url += "&tipo=gasto"
        }

        const response = await financeApiGet(url)
        const json: TransactionsResponse = await response.json()

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        const d = json.data ?? null
        setData(d)
        setTxRows(d?.transactions ?? [])
      } catch (err) {
        if (opts.showLoading) {
          const errorMessage = err instanceof Error ? err.message : "Error desconocido"
          setError(errorMessage)
          setData(null)
          setTxRows([])
        }
      } finally {
        if (opts.showLoading) setLoading(false)
      }
    },
    [month, category, subcategoryParam, financeAccountId, tipoFilterUrl, capitalEpoch],
  )

  const fetchTransactions = useCallback(async () => {
    await loadTransactions({ showLoading: true })
  }, [loadTransactions])

  const fetchTransactionsSilent = useCallback(() => {
    startTransition(() => {
      void loadTransactions({ showLoading: false })
    })
  }, [loadTransactions])

  useEffect(() => {
    void fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [month, category, subcategoryParam, financeAccountId, tipoFilterUrl])

  useEffect(() => {
    if (!supabaseEnabled) {
      setCatalogRows([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await financeApiGet("/api/orbita/finanzas/subcategory-catalog")
        const json = (await res.json()) as {
          success?: boolean
          data?: { rows?: FinanceSubcategoryCatalogRow[] }
        }
        if (cancelled) return
        if (res.ok && json.success && Array.isArray(json.data?.rows)) {
          setCatalogRows(json.data!.rows!)
        }
      } catch {
        if (!cancelled) setCatalogRows([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabaseEnabled])

  const schedulePatch = useCallback(
    (
      id: string,
      body: { category?: string; subcategory?: string | null; type?: "income" | "expense" },
    ) => {
      const prev = patchTimers.current.get(id)
      if (prev) clearTimeout(prev)
      const t = setTimeout(() => {
        patchTimers.current.delete(id)
        void (async () => {
          setPatchErr(null)
          try {
            const res = await financeApiJson("/api/orbita/finanzas/transactions", {
              method: "PATCH",
              body: {
                id,
                category: body.category,
                subcategory: body.subcategory,
                type: body.type,
              },
            })
            const json = (await res.json()) as PatchTxResponse
            if (!res.ok || !json.success || !json.data?.transaction) {
              throw new Error(messageForHttpError(res.status, json.error, res.statusText))
            }
            const u = json.data.transaction
            setTxRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...u } : r)))
          } catch (e) {
            setPatchErr(e instanceof Error ? e.message : "No se pudo guardar")
          }
        })()
      }, 450)
      patchTimers.current.set(id, t)
    },
    [],
  )

  useEffect(() => {
    return () => {
      patchTimers.current.forEach((t) => clearTimeout(t))
      patchTimers.current.clear()
    }
  }, [])

  const deleteReconciliationTx = useCallback(
    async (tx: Transaction) => {
      if (!tx.id) return
      if (!supabaseEnabled) return
      if (!isReconciliationAdjustmentDescription(tx.descripcion)) return
      if (!window.confirm("¿Eliminar este ajuste de conciliación? No se puede deshacer.")) return

      const id = tx.id
      const amount = Number(tx.monto ?? 0)
      setDeletingId(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      startTransition(() => {
        setTxRows((rows) => rows.filter((r) => r.id !== id))
        setData((prev) => {
          if (!prev) return prev
          const nextSubtotal = prev.subtotal - amount
          const nextDelta = prev.delta == null ? null : nextSubtotal - prev.previousSubtotal
          return { ...prev, subtotal: nextSubtotal, delta: nextDelta }
        })
      })

      await yieldToNextPaint()

      try {
        setPatchErr(null)
        const res = await financeApiDelete(
          `/api/orbita/finanzas/transactions?id=${encodeURIComponent(id)}`,
        )
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        touchCapitalData?.()
        fetchTransactionsSilent()
      } catch (e) {
        setPatchErr(e instanceof Error ? e.message : "No se pudo eliminar")
        fetchTransactionsSilent()
      } finally {
        setDeletingId(null)
      }
    },
    [fetchTransactionsSilent, supabaseEnabled, touchCapitalData],
  )

  const bulkDeleteReconciliation = useCallback(async () => {
    if (!supabaseEnabled || selectedIds.size === 0) return
    const ids = [...selectedIds]
    if (
      !window.confirm(
        `¿Eliminar ${ids.length} ajuste(s) de conciliación seleccionado(s)? No se puede deshacer.`,
      )
    ) {
      return
    }
    setBulkDeleting(true)
    setPatchErr(null)
    await yieldToNextPaint()
    try {
      const res = await financeApiJson("/api/orbita/finanzas/transactions", {
        method: "POST",
        body: { deleteReconciliationAdjustmentIds: ids },
      })
      const json = (await res.json()) as {
        success?: boolean
        error?: string
        data?: { deleted?: string[]; skipped?: string[] }
      }
      if (!res.ok || !json.success) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      const deleted = json.data?.deleted ?? []
      const skipped = json.data?.skipped ?? []
      if (skipped.length > 0) {
        setPatchErr(
          `${deleted.length} eliminado(s). ${skipped.length} omitido(s) (no son ajustes de conciliación o no aplican).`,
        )
      }
      setSelectedIds(new Set())
      touchCapitalData?.()
      fetchTransactionsSilent()
    } catch (e) {
      setPatchErr(e instanceof Error ? e.message : "No se pudo eliminar la selección")
      fetchTransactionsSilent()
    } finally {
      setBulkDeleting(false)
    }
  }, [fetchTransactionsSilent, selectedIds, supabaseEnabled, touchCapitalData])

  const setFinanceAccountId = (id: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (id) p.set("account", id)
    else p.delete("account")
    const qs = p.toString()
    router.replace(qs ? `/finanzas/transactions?${qs}` : "/finanzas/transactions")
  }

  const setTipoFilter = (v: "" | "ingreso" | "gasto") => {
    const p = new URLSearchParams(searchParams.toString())
    if (v) p.set("tipo", v)
    else p.delete("tipo")
    const qs = p.toString()
    router.replace(qs ? `/finanzas/transactions?${qs}` : "/finanzas/transactions")
  }

  const setCategoryFilter = (cat: string) => {
    const p = new URLSearchParams(searchParams.toString())
    const next = cat.trim()
    if (next) p.set("category", next)
    else p.delete("category")
    p.delete("subcategory")
    const qs = p.toString()
    router.replace(qs ? `/finanzas/transactions?${qs}` : "/finanzas/transactions")
  }

  const downloadCsv = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTemplateXlsx = async () => {
    setTemplateDownloading(true)
    setPatchErr(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/orbita/finanzas/transactions/template", {
        cache: "no-store",
        headers,
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `Error ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "plantilla-movimientos-orvita.xlsx"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setPatchErr(e instanceof Error ? e.message : "No se pudo descargar la plantilla")
    } finally {
      setTemplateDownloading(false)
    }
  }

  const importCsvFile = useCallback(
    async (file: File) => {
      if (!supabaseEnabled) return
      setImportingCsv(true)
      setImportNotice(null)
      setPatchErr(null)
      try {
        const text = await file.text()
        const res = await financeApiJson("/api/orbita/finanzas/transactions/import", {
          method: "POST",
          body: { csv: text },
        })
        const json = (await res.json()) as {
          success?: boolean
          error?: string
          data?: {
            inserted?: number
            parseErrors?: { line: number; message: string }[]
            snapshotWarnings?: string[]
          }
        }
        if (!res.ok || !json.success) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        const d = json.data
        const inserted = d?.inserted ?? 0
        const pe = d?.parseErrors ?? []
        const sw = d?.snapshotWarnings
        let msg = `Se importaron ${inserted} movimiento(s).`
        if (pe.length > 0) {
          msg += `\n\nSe omitieron ${pe.length} fila(s) (formato, monto o par no válido en el catálogo).`
        }
        if (sw?.length) {
          msg += `\n\nResúmenes mensuales: ${sw.join("; ")}`
        }
        setImportNotice(null)
        setImportSuccessDialog({
          open: true,
          message: msg,
          omittedLines: pe.length > 0 ? pe : undefined,
        })
        touchCapitalData?.()
        await loadTransactions({ showLoading: false })
      } catch (e) {
        setPatchErr(e instanceof Error ? e.message : "Error al importar")
      } finally {
        setImportingCsv(false)
      }
    },
    [loadTransactions, supabaseEnabled, touchCapitalData],
  )

  const transactions = data != null ? txRows : []

  const reconciliationRowIds = useMemo(
    () =>
      transactions
        .filter((t) => Boolean(t.id) && isReconciliationAdjustmentDescription(t.descripcion))
        .map((t) => t.id as string),
    [transactions],
  )

  const allReconciliationSelected =
    reconciliationRowIds.length > 0 && reconciliationRowIds.every((id) => selectedIds.has(id))

  useEffect(() => {
    const el = selectAllRef.current
    if (!el) return
    const n = reconciliationRowIds.length
    const sel = reconciliationRowIds.filter((id) => selectedIds.has(id)).length
    el.indeterminate = sel > 0 && sel < n
  }, [reconciliationRowIds, selectedIds])

  const subtotal = data?.subtotal ?? 0
  const previousSubtotal = data?.previousSubtotal ?? 0
  const delta = data?.delta ?? null
  const deltaValue = delta ?? (previousSubtotal ? subtotal - previousSubtotal : 0)

  const periodReady = Boolean(month)
  const contentLoading = periodReady && loading
  const contentError = periodReady && error
  const contentReady = periodReady && !loading && !error && data !== null

  const reduceMotion = useReducedMotion()
  const deltaBarPct = useMemo(() => {
    const absDelta = Math.abs(deltaValue)
    const base = Math.max(Math.abs(previousSubtotal), Math.abs(subtotal), 1)
    return Math.min(100, Math.round((absDelta / base) * 100))
  }, [deltaValue, previousSubtotal, subtotal])

  const statMotionContainer = useMemo(
    () => ({
      hidden: {},
      show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
    }),
    [reduceMotion],
  )
  const statMotionItem = useMemo(
    () => ({
      hidden: reduceMotion ? {} : { opacity: 0, y: 10, scale: 0.98 },
      show: reduceMotion
        ? {}
        : {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring" as const, stiffness: 420, damping: 30 },
          },
    }),
    [reduceMotion],
  )

  const selectedAccountLabel = useMemo(() => {
    if (!financeAccountId) return null
    return ledgerAccounts.find((a) => a.id === financeAccountId)?.label ?? null
  }, [financeAccountId, ledgerAccounts])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAllReconciliation = useCallback(() => {
    if (reconciliationRowIds.length === 0) return
    if (allReconciliationSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reconciliationRowIds))
    }
  }, [allReconciliationSelected, reconciliationRowIds])

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  return (
    <div className={financeViewRootClass}>
      <Card className="group/card min-w-0 overflow-hidden p-0 transition-[box-shadow] duration-300 hover:shadow-[0_8px_28px_rgba(15,23,42,0.09)] motion-reduce:transition-none">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-orbita-border/70 bg-orbita-surface-alt/35 px-3 py-2 sm:items-center sm:px-4">
          <div className="min-w-0 flex-1">
            <p className={cn("m-0", financeSectionEyebrowClass)}>Movimientos</p>
            <p className="mt-0.5 text-[11px] tabular-nums text-orbita-muted">
              Periodo{" "}
              <span className="font-medium text-orbita-secondary">{month || "—"}</span>
            </p>
          </div>
          <div className="flex max-w-full flex-wrap justify-end gap-1.5">
            {contentReady && transactions.length > 0 ? (
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "border-[color-mix(in_srgb,var(--color-accent-finance)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))] text-orbita-primary shadow-[0_1px_0_color-mix(in_srgb,#fff_40%,transparent)]",
                )}
              >
                <Sparkles className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
                Lista viva
              </span>
            ) : null}
            {tipoFilterUrl === "ingreso" ? (
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
                )}
              >
                Solo ingresos
              </span>
            ) : tipoFilterUrl === "gasto" ? (
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200",
                )}
              >
                Solo gastos
              </span>
            ) : null}
            {selectedAccountLabel ? (
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "max-w-[12rem] truncate border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] text-orbita-primary",
                )}
                title={selectedAccountLabel}
              >
                {selectedAccountLabel}
              </span>
            ) : null}
            {category.trim() ? (
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "max-w-[14rem] truncate border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] text-orbita-primary",
                )}
                title={category.trim()}
              >
                {category.trim()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 px-3 py-1.5 sm:px-4 sm:py-2">
          <div
            className={cn(
              "grid min-w-0 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:gap-3 sm:overflow-x-auto sm:overscroll-x-contain sm:[-webkit-overflow-scrolling:touch]",
              supabaseEnabled ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {supabaseEnabled ? (
              <label className="flex min-w-0 items-center gap-1.5 sm:flex-[1.25] sm:gap-2">
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.11em] text-orbita-secondary">
                  Cuenta
                </span>
                <select
                  value={financeAccountId}
                  onChange={(e) => setFinanceAccountId(e.target.value)}
                  disabled={contentLoading || !periodReady}
                  className={cn(txFilterBarSelect, "w-full min-w-0 sm:max-w-none")}
                  aria-label="Filtrar por cuenta"
                >
                  <option value="">Todas</option>
                  {ledgerAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.11em] text-orbita-secondary">
                Categoría
              </span>
              <select
                value={category}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={contentLoading || !periodReady}
                className={cn(txFilterBarSelect, "min-w-[7rem] w-full max-w-[15rem]")}
                aria-label="Filtrar por categoría"
              >
                <option value="">Todas</option>
                {catalogCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-1.5 sm:shrink-0 sm:flex-none sm:gap-2">
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.11em] text-orbita-secondary">
                Tipo
              </span>
              <select
                value={tipoFilterUrl}
                onChange={(e) => setTipoFilter(e.target.value as "" | "ingreso" | "gasto")}
                disabled={contentLoading || !periodReady}
                className={cn(txFilterBarSelect, "w-full min-w-0 sm:w-36")}
                aria-label="Filtrar por ingreso o gasto"
              >
                <option value="">Todos</option>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </label>
          </div>
          {category.trim() ? (
            <div className="mt-2 flex min-w-0 items-center gap-2 sm:hidden">
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "min-w-0 max-w-[70%] truncate border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] text-orbita-primary",
                )}
                title={category.trim()}
              >
                {category.trim()}
              </span>
              <button
                type="button"
                className="shrink-0 text-[10px] font-semibold text-orbita-secondary underline decoration-orbita-border underline-offset-2"
                onClick={() => setCategoryFilter("")}
              >
                Quitar filtro
              </button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-orbita-border/65 bg-[color-mix(in_srgb,var(--color-surface-alt)_30%,var(--color-surface))] px-3 py-2.5 sm:px-4 sm:py-3">
          {contentError ? (
            <div
              className="rounded-xl border px-3 py-2.5 sm:px-4"
              style={{
                background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
                borderColor: "color-mix(in srgb, var(--color-accent-danger) 32%, var(--color-border))",
                color: "var(--color-accent-danger)",
              }}
              role="alert"
            >
              <p className="m-0 text-[11px] font-semibold sm:text-xs">Error al cargar movimientos</p>
              <p className="mt-1 text-[10px] opacity-95 [text-wrap:pretty] sm:text-[11px]">{error}</p>
            </div>
          ) : contentLoading ? (
            <div
              className="grid min-w-0 grid-cols-1 divide-y divide-orbita-border/45 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
              aria-busy="true"
              aria-label="Cargando resumen del periodo"
            >
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  className={cn(
                    txStatCellShell,
                    "animate-pulse max-sm:grid-rows-[auto_auto] max-sm:gap-y-1",
                  )}
                >
                  <div className="h-8 w-8 shrink-0 rounded-full bg-orbita-border/55 max-sm:row-start-1 max-sm:self-center" />
                  <div className="max-sm:contents sm:min-w-0 sm:flex-1 sm:space-y-2 sm:pt-0.5">
                    <div className="h-2 w-16 rounded bg-orbita-border/65 max-sm:col-start-2 max-sm:row-start-1 max-sm:self-center" />
                    <div className="h-5 w-[4.5rem] rounded bg-orbita-border/55 max-sm:col-start-3 max-sm:row-start-1 max-sm:justify-self-end max-sm:self-center sm:w-24" />
                    <div className="h-1.5 w-16 rounded bg-orbita-border/45 max-sm:col-start-3 max-sm:row-start-2 max-sm:justify-self-end sm:w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : contentReady ? (
            <motion.div
              className="grid min-w-0 grid-cols-1 divide-y divide-orbita-border/45 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
              variants={statMotionContainer}
              initial="hidden"
              animate="show"
              key={`${month}-${financeAccountId}-${tipoFilterUrl}-${category}-${subtotal}-${deltaValue}-${transactions.length}`}
            >
              <motion.div
                variants={statMotionItem}
                className={cn(txStatCellShell, "max-sm:grid-rows-[auto_auto] max-sm:gap-y-0.5")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)] text-[color-mix(in_srgb,var(--color-accent-finance)_90%,var(--color-text-primary))] shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)] max-sm:row-start-1 max-sm:self-center">
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 max-sm:contents sm:flex-1">
                  <p
                    className={cn(
                      financeCardMicroLabelClass,
                      "max-sm:col-start-2 max-sm:row-start-1 max-sm:self-center max-sm:pr-1",
                    )}
                  >
                    Balance neto
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 break-words text-lg font-semibold tabular-nums text-orbita-primary sm:text-xl",
                      "max-sm:col-start-3 max-sm:row-start-1 max-sm:mt-0 max-sm:self-center max-sm:text-right max-sm:leading-none",
                    )}
                  >
                    ${Math.abs(subtotal).toLocaleString("es-CO", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] text-orbita-muted",
                      "max-sm:col-start-3 max-sm:row-start-2 max-sm:mt-0 max-sm:text-right max-sm:leading-tight sm:text-left",
                    )}
                  >
                    Suma filtrada del mes
                  </p>
                </div>
              </motion.div>

              <motion.div
                variants={statMotionItem}
                className={cn(txStatCellShell, "max-sm:grid-rows-[auto_auto] max-sm:gap-y-1")}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 max-sm:row-start-1 max-sm:self-center",
                    deltaValue >= 0
                      ? "bg-emerald-500/12 text-emerald-600 ring-emerald-500/22 dark:text-emerald-400"
                      : "bg-rose-500/12 text-rose-600 ring-rose-500/22 dark:text-rose-400",
                  )}
                >
                  {deltaValue >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 max-sm:contents sm:flex-1">
                  <p
                    className={cn(
                      financeCardMicroLabelClass,
                      "max-sm:col-start-2 max-sm:row-start-1 max-sm:self-center max-sm:pr-1",
                    )}
                  >
                    vs mes anterior
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 break-words text-lg font-semibold tabular-nums sm:text-xl",
                      "max-sm:col-start-3 max-sm:row-start-1 max-sm:mt-0 max-sm:self-center max-sm:text-right max-sm:leading-none",
                      deltaValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {deltaValue >= 0 ? "+" : "-"}$
                    {Math.abs(deltaValue).toLocaleString("es-CO", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <div
                    className={cn(
                      "mt-2 h-1 overflow-hidden rounded-full bg-orbita-border/40",
                      "max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-2 max-sm:mt-0 sm:col-auto sm:row-auto",
                    )}
                    aria-hidden
                  >
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        deltaValue >= 0
                          ? "bg-[color-mix(in_srgb,var(--color-accent-health)_85%,transparent)]"
                          : "bg-[color-mix(in_srgb,var(--color-accent-danger)_80%,transparent)]",
                      )}
                      initial={reduceMotion ? false : { width: "0%" }}
                      animate={{ width: `${deltaBarPct}%` }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={statMotionItem}
                className={cn(txStatCellShell, "max-sm:grid-rows-[auto_auto_auto] max-sm:gap-y-0.5")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-surface-alt)_65%,var(--color-surface))] text-orbita-primary shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-orbita-border/35 max-sm:row-start-1 max-sm:self-center">
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 max-sm:contents sm:flex-1">
                  <p
                    className={cn(
                      financeCardMicroLabelClass,
                      "max-sm:col-start-2 max-sm:row-start-1 max-sm:self-center max-sm:pr-1",
                    )}
                  >
                    Registros
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-lg font-semibold tabular-nums text-orbita-primary sm:text-xl",
                      "max-sm:col-start-3 max-sm:row-start-1 max-sm:mt-0 max-sm:self-center max-sm:text-right max-sm:leading-none",
                    )}
                  >
                    {transactions.length}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] text-orbita-muted",
                      "max-sm:col-start-3 max-sm:row-start-2 max-sm:mt-0 max-sm:text-right max-sm:leading-tight sm:text-left",
                    )}
                  >
                    Filas en esta vista
                  </p>
                  <div
                    className={cn(
                      "mt-2 flex gap-1.5",
                      "max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-3 max-sm:mt-0 max-sm:justify-end sm:col-auto sm:row-auto",
                    )}
                    aria-hidden
                  >
                    {[1, 5, 15].map((tier) => (
                      <span
                        key={tier}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                          transactions.length >= tier
                            ? "bg-[color-mix(in_srgb,var(--color-accent-finance)_72%,transparent)]"
                            : "bg-orbita-border/55",
                        )}
                        title={`${tier}+`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : periodReady ? (
            <p className="m-0 text-center text-[11px] leading-relaxed text-orbita-secondary sm:text-xs">
              No hay datos para este periodo todavía.
            </p>
          ) : (
            <p className="m-0 text-center text-[11px] leading-relaxed text-orbita-secondary sm:text-xs">
              Elige un mes en Capital para cargar movimientos e importar o exportar al final de la página.
            </p>
          )}
        </div>
      </Card>

      {patchErr ? (
        <p className="text-xs text-rose-600" role="status">
          {patchErr}
        </p>
      ) : null}

      {importNotice ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {importNotice}
        </p>
      ) : null}

      <Dialog
        open={importSuccessDialog.open}
        onOpenChange={(open) => {
          if (!open) setImportSuccessDialog({ open: false, message: "" })
        }}
      >
        <DialogContent className="max-w-md" showClose>
          <DialogHeader>
            <DialogTitle>Importación completada</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-[var(--color-text-primary)]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{importSuccessDialog.message}</p>
                {importSuccessDialog.omittedLines && importSuccessDialog.omittedLines.length > 0 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="m-0 text-[11px] font-semibold text-amber-900 dark:text-amber-100">
                      Detalle de filas omitidas (primeras {Math.min(12, importSuccessDialog.omittedLines.length)})
                    </p>
                    <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-4 text-[10px] text-amber-950/90 dark:text-amber-50/90">
                      {importSuccessDialog.omittedLines.slice(0, 12).map((e, i) => (
                        <li key={`${e.line}-${i}`}>
                          Línea {e.line}: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-4 py-2 text-sm font-semibold text-orbita-primary transition hover:bg-orbita-surface-alt"
              >
                Aceptar
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!periodReady ? (
        <div className="p-6 text-center text-orbita-secondary">
          <p>No hay movimientos disponibles</p>
        </div>
      ) : contentReady ? (
        <>
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-orbita-secondary">
              <p>No hay movimientos para esta selección</p>
            </div>
          ) : (
            <div className="min-w-0 max-w-full overflow-hidden rounded-[var(--radius-card)] border border-orbita-border/80 bg-[color-mix(in_srgb,var(--color-surface-alt)_22%,var(--color-surface))] shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
              {supabaseEnabled && reconciliationRowIds.length > 0 ? (
                <div className="flex flex-col gap-2 border-b border-orbita-border/80 bg-orbita-surface-alt/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
                  <p className="min-w-0 text-[11px] leading-snug text-orbita-secondary [text-wrap:pretty]">
                    {selectedIds.size > 0
                      ? `${selectedIds.size} ajuste(s) de conciliación seleccionado(s)`
                      : "Selecciona ajustes de conciliación para borrar varios a la vez"}
                  </p>
                  <button
                    type="button"
                    disabled={selectedIds.size === 0 || bulkDeleting}
                    onClick={() => void bulkDeleteReconciliation()}
                    className="shrink-0 self-start rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto dark:text-rose-300"
                  >
                    {bulkDeleting ? "Eliminando…" : "Eliminar seleccionados"}
                  </button>
                </div>
              ) : null}
              <div
                className="sm:hidden max-h-[min(70vh,56rem)] min-w-0 divide-y divide-orbita-border/60 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
                role="feed"
                aria-label="Movimientos del periodo"
              >
                {transactions.map((tx, idx) => {
                  const catLine = [tx.categoria, tx.subcategoria].filter(Boolean).join(" · ")
                  const tipoResolved =
                    tx.tipo ?? (tx.monto > 0 ? ("income" as const) : ("expense" as const))
                  const tipoLabel = tipoResolved === "income" ? "Ingreso" : "Gasto"
                  const montoStr = `$${Math.abs(tx.monto).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}`
                  const isIngreso = tipoResolved === "income"
                  const isReconciliationAdjustment = isReconciliationAdjustmentDescription(tx.descripcion)
                  const mobileTint = isIngreso
                    ? "shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-accent-health)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_5%,var(--color-surface))]"
                    : "shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-accent-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_4%,var(--color-surface))]"
                  const editable = Boolean(supabaseEnabled && tx.id)
                  const pairOpts = pairsForRow(catalogPairs, tx.categoria, tx.subcategoria)
                  const currentPairKey = pairKey(tx.categoria, tx.subcategoria)

                  return (
                    <article
                      key={tx.id ?? `m-${idx}`}
                      className={cn("min-w-0 px-2 py-1.5", mobileTint)}
                    >
                      <div className="flex items-start gap-1.5">
                        {supabaseEnabled && tx.id && isReconciliationAdjustment ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(tx.id)}
                            onChange={() => toggleSelect(tx.id!)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-orbita-border"
                            aria-label={`Seleccionar ajuste ${tx.descripcion?.slice(0, 40) ?? ""}`}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0">
                                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-orbita-primary">
                                  {tx.fecha}
                                </span>
                                {!editable ? (
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
                                      isIngreso
                                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                        : "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                                    )}
                                  >
                                    {tipoLabel}
                                  </span>
                                ) : null}
                                <span className="min-w-0 truncate text-[9px] leading-tight text-orbita-secondary">
                                  <span className="text-orbita-muted">· </span>
                                  {tx.cuenta?.trim() ? tx.cuenta : "—"}
                                </span>
                              </div>
                            </div>
                            <p className="shrink-0 pt-px text-right text-[11px] font-semibold tabular-nums leading-none text-orbita-primary">
                              {montoStr}
                            </p>
                          </div>
                          {editable ? (
                            <div className="grid min-w-0 grid-cols-2 gap-1">
                              <select
                                aria-label="Tipo de movimiento"
                                className={cn(txSelectTipo, txSelectMobileDense, "max-w-full")}
                                value={tipoResolved}
                                onChange={(e) => {
                                  const t = e.target.value as "income" | "expense"
                                  const abs = Math.abs(tx.monto)
                                  setTxRows((rs) =>
                                    rs.map((r) =>
                                      r.id === tx.id ? { ...r, tipo: t, monto: t === "income" ? abs : -abs } : r,
                                    ),
                                  )
                                  schedulePatch(tx.id!, { type: t })
                                }}
                              >
                                <option value="income">Ingreso</option>
                                <option value="expense">Gasto</option>
                              </select>
                              {pairOpts.length === 0 ? (
                                <span className="flex min-h-7 items-center text-[9px] text-orbita-secondary">
                                  Sin catálogo
                                </span>
                              ) : (
                                <select
                                  aria-label="Subcategoría (define la categoría)"
                                  className={cn(txSelectGhost, txSelectMobileDense, "max-w-full")}
                                  value={
                                    pairOpts.some((p) => pairKey(p.category, p.subcategory) === currentPairKey)
                                      ? currentPairKey
                                      : pairKey(pairOpts[0]!.category, pairOpts[0]!.subcategory)
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value
                                    const i = v.indexOf(CAT_SUB_SEP)
                                    const newCat = i >= 0 ? v.slice(0, i).trim() : ""
                                    const newSub = i >= 0 ? v.slice(i + CAT_SUB_SEP.length).trim() : ""
                                    setTxRows((rs) =>
                                      rs.map((r) =>
                                        r.id === tx.id ? { ...r, categoria: newCat, subcategoria: newSub } : r,
                                      ),
                                    )
                                    schedulePatch(tx.id!, {
                                      category: newCat,
                                      subcategory: newSub || null,
                                    })
                                  }}
                                >
                                  {pairOpts.map((p) => {
                                    const pk = pairKey(p.category, p.subcategory)
                                    return (
                                      <option key={pk} value={pk}>
                                        {p.subcategory} · {p.category}
                                      </option>
                                    )
                                  })}
                                </select>
                              )}
                            </div>
                          ) : (
                            <p className="truncate text-[10px] leading-tight text-orbita-primary">{catLine}</p>
                          )}
                          <p className="line-clamp-1 text-[10px] leading-tight text-orbita-secondary [overflow-wrap:anywhere]">
                            {tx.descripcion}
                          </p>
                          {supabaseEnabled && tx.id && isReconciliationAdjustment ? (
                            <div className="flex justify-end pt-0.5">
                              <button
                                type="button"
                                disabled={deletingId === tx.id}
                                aria-busy={deletingId === tx.id}
                                onClick={() => void deleteReconciliationTx(tx)}
                                className="text-[10px] font-semibold text-rose-600 transition-opacity enabled:hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
                              >
                                {deletingId === tx.id ? "…" : "Eliminar ajuste"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="hidden max-h-[min(70vh,56rem)] min-w-0 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-x touch-pan-y sm:block">
                <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
                  <colgroup>
                    {supabaseEnabled ? <col style={{ width: "2.25rem" }} /> : null}
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead className="sticky top-0 z-[1] border-b border-orbita-border/80 bg-[color-mix(in_srgb,var(--color-surface-alt)_92%,var(--color-surface))] text-[9px] font-semibold uppercase tracking-[0.08em] text-orbita-secondary backdrop-blur-sm sm:text-[10px]">
                    <tr>
                      {supabaseEnabled ? (
                        <th scope="col" className="w-9 px-1 py-1.5 text-center sm:py-2">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allReconciliationSelected}
                            onChange={toggleSelectAllReconciliation}
                            disabled={reconciliationRowIds.length === 0}
                            className="h-3.5 w-3.5 rounded border-orbita-border"
                            title="Seleccionar todos los ajustes de conciliación"
                            aria-label="Seleccionar todos los ajustes de conciliación visibles"
                          />
                        </th>
                      ) : null}
                      <th scope="col" className="whitespace-nowrap px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
                        Fecha
                      </th>
                      <th scope="col" className="px-1 py-1.5 text-left sm:py-2">
                        Tipo
                      </th>
                      <th scope="col" className="px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
                        Clasificación
                      </th>
                      <th scope="col" className="px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
                        Cuenta
                      </th>
                      <th scope="col" className="px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
                        Concepto
                      </th>
                      <th
                        scope="col"
                        className="whitespace-nowrap px-1.5 py-1.5 text-right tabular-nums sm:px-2 sm:py-2"
                      >
                        Monto
                      </th>
                      <th scope="col" className="whitespace-nowrap px-1.5 py-1.5 text-right sm:px-2 sm:py-2">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => {
                      const catLine = [tx.categoria, tx.subcategoria].filter(Boolean).join(" · ")
                      const tipoResolved =
                        tx.tipo ?? (tx.monto > 0 ? ("income" as const) : ("expense" as const))
                      const tipoLabel = tipoResolved === "income" ? "Ingreso" : "Gasto"
                      const montoStr = `$${Math.abs(tx.monto).toLocaleString("es-CO", {
                        maximumFractionDigits: 0,
                      })}`
                      const isIngreso = tipoResolved === "income"
                      const isReconciliationAdjustment = isReconciliationAdjustmentDescription(tx.descripcion)
                      const rowBorder = "border-b border-orbita-border/50"
                      const rowTint = isIngreso
                        ? "shadow-[inset_0_2px_0_0_color-mix(in_srgb,var(--color-accent-health)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface))] hover:bg-[color-mix(in_srgb,var(--color-accent-health)_9%,var(--color-surface))]"
                        : "shadow-[inset_0_2px_0_0_color-mix(in_srgb,var(--color-accent-danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_5%,var(--color-surface))] hover:bg-[color-mix(in_srgb,var(--color-accent-danger)_8%,var(--color-surface))]"
                      const editable = Boolean(supabaseEnabled && tx.id)
                      const pairOpts = pairsForRow(catalogPairs, tx.categoria, tx.subcategoria)
                      const currentPairKey = pairKey(tx.categoria, tx.subcategoria)

                      return (
                        <tr
                          key={tx.id ?? idx}
                          className={`${rowBorder} ${rowTint} last:border-b-0 transition-colors`}
                        >
                          {supabaseEnabled ? (
                            <td className="px-1 py-1 align-middle text-center sm:py-1.5">
                              {tx.id && isReconciliationAdjustment ? (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(tx.id)}
                                  onChange={() => toggleSelect(tx.id!)}
                                  className="h-3.5 w-3.5 rounded border-orbita-border"
                                  aria-label={`Seleccionar ajuste ${tx.descripcion?.slice(0, 40) ?? ""}`}
                                />
                              ) : (
                                <span className="inline-block w-3.5" aria-hidden />
                              )}
                            </td>
                          ) : null}
                          <td className="whitespace-nowrap px-1.5 py-1 align-middle tabular-nums text-orbita-primary sm:px-2 sm:py-1.5">
                            {tx.fecha}
                          </td>
                          <td
                            className={`min-w-0 px-1 py-1 align-middle sm:py-1.5 ${
                              isIngreso
                                ? "text-[var(--color-accent-health)]"
                                : "text-[var(--color-accent-danger)]"
                            }`}
                            title={tipoLabel}
                          >
                            {editable ? (
                              <select
                                aria-label="Tipo de movimiento"
                                className={txSelectTipo}
                                value={tipoResolved}
                                onChange={(e) => {
                                  const t = e.target.value as "income" | "expense"
                                  const abs = Math.abs(tx.monto)
                                  setTxRows((rs) =>
                                    rs.map((r) =>
                                      r.id === tx.id
                                        ? { ...r, tipo: t, monto: t === "income" ? abs : -abs }
                                        : r,
                                    ),
                                  )
                                  schedulePatch(tx.id!, { type: t })
                                }}
                              >
                                <option value="income">Ingreso</option>
                                <option value="expense">Gasto</option>
                              </select>
                            ) : (
                              <span className="block truncate text-[9px] font-semibold sm:text-[10px]">
                                {tipoLabel}
                              </span>
                            )}
                          </td>
                          <td className="min-w-0 px-1.5 py-1 align-middle text-orbita-primary sm:px-2 sm:py-1.5">
                            {editable ? (
                              pairOpts.length === 0 ? (
                                <span className="text-[10px] text-orbita-secondary">Sin catálogo</span>
                              ) : (
                                <select
                                  aria-label="Subcategoría (define la categoría)"
                                  className={txSelectGhost}
                                  value={
                                    pairOpts.some((p) => pairKey(p.category, p.subcategory) === currentPairKey)
                                      ? currentPairKey
                                      : pairKey(pairOpts[0]!.category, pairOpts[0]!.subcategory)
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value
                                    const i = v.indexOf(CAT_SUB_SEP)
                                    const newCat = i >= 0 ? v.slice(0, i).trim() : ""
                                    const newSub = i >= 0 ? v.slice(i + CAT_SUB_SEP.length).trim() : ""
                                    setTxRows((rs) =>
                                      rs.map((r) =>
                                        r.id === tx.id ? { ...r, categoria: newCat, subcategoria: newSub } : r,
                                      ),
                                    )
                                    schedulePatch(tx.id!, {
                                      category: newCat,
                                      subcategory: newSub || null,
                                    })
                                  }}
                                >
                                  {pairOpts.map((p) => {
                                    const pk = pairKey(p.category, p.subcategory)
                                    return (
                                      <option key={pk} value={pk}>
                                        {p.subcategory} · {p.category}
                                      </option>
                                    )
                                  })}
                                </select>
                              )
                            ) : (
                              <span className="truncate block" title={catLine}>
                                {catLine}
                              </span>
                            )}
                          </td>
                          <td
                            className="truncate px-1.5 py-1 align-middle text-[10px] text-orbita-secondary sm:px-2 sm:py-1.5 sm:text-[11px]"
                            title={tx.cuenta || ""}
                          >
                            {tx.cuenta || "—"}
                          </td>
                          <td
                            className="truncate px-1.5 py-1 align-middle text-orbita-secondary sm:px-2 sm:py-1.5"
                            title={tx.descripcion}
                          >
                            {tx.descripcion}
                          </td>
                          <td className="whitespace-nowrap px-1.5 py-1 align-middle text-right tabular-nums font-semibold text-orbita-primary sm:px-2 sm:py-1.5">
                            {montoStr}
                          </td>
                          <td className="whitespace-nowrap px-1.5 py-1 align-middle text-right text-[10px] sm:px-2 sm:py-1.5 sm:text-[11px]">
                            {supabaseEnabled && tx.id && isReconciliationAdjustment ? (
                              <button
                                type="button"
                                disabled={deletingId === tx.id}
                                aria-busy={deletingId === tx.id}
                                onClick={() => void deleteReconciliationTx(tx)}
                                className="font-semibold text-rose-600 transition-opacity enabled:hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
                              >
                                {deletingId === tx.id ? "…" : "Eliminar"}
                              </button>
                            ) : (
                              <span className="text-orbita-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Card className="min-w-0 overflow-hidden p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-orbita-border/70 bg-orbita-surface-alt/35 px-3 py-2 sm:px-4 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.13em] text-orbita-secondary">
                    Importar y exportar
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary">
                    Plantilla Excel, CSV o descarga de la vista actual ({month || "periodo"}).
                  </p>
                </div>
                <ChevronDown
                  className="mt-0.5 h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
            <div className="grid gap-3 p-3 sm:p-4">
              <ul className="m-0 list-disc space-y-1.5 pl-4 text-[10px] leading-relaxed text-orbita-secondary [text-wrap:pretty] marker:text-orbita-secondary/80">
                <li>
                  La plantilla Excel incluye listas del <strong className="font-semibold text-orbita-primary">catálogo del hogar</strong>:{" "}
                  <strong className="font-semibold text-orbita-primary">elige la subcategoría en D</strong> y la categoría en C se rellena sola. El{" "}
                  <strong className="font-semibold text-orbita-primary">tipo de gasto</strong> (fijo/variable/…) y el{" "}
                  <strong className="font-semibold text-orbita-primary">impacto financiero</strong> los aplica el sistema desde esa tabla al
                  ser un par válido; no van columnas aparte.
                </li>
                <li>
                  Columna <strong className="font-semibold text-orbita-primary">Cuenta</strong>: en la hoja Listas verás las{" "}
                  <strong className="font-semibold text-orbita-primary">cuentas del hogar</strong>; puedes usar una etiqueta nueva (se crea al
                  importar).
                </li>
                <li>
                  Para importar aquí, exporta la hoja a <strong className="font-semibold text-orbita-primary">CSV UTF-8</strong> (desde Excel:
                  «Guardar como» CSV). Se aceptan separador <strong className="font-semibold text-orbita-primary">coma</strong> (como «Exportar
                  vista») o <strong className="font-semibold text-orbita-primary">punto y coma</strong> según la configuración regional.
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={templateDownloading}
                  onClick={() => void downloadTemplateXlsx()}
                  className="min-h-9 flex-1 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface-alt px-3 py-2 text-center text-xs font-semibold text-orbita-primary transition [flex-basis:10rem] enabled:hover:bg-orbita-surface disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:min-w-0"
                >
                  {templateDownloading ? "Generando…" : "Plantilla (.xlsx)"}
                </button>
                {supabaseEnabled ? (
                  <>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      className="hidden"
                      aria-hidden
                      tabIndex={-1}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (f) void importCsvFile(f)
                      }}
                    />
                    <button
                      type="button"
                      disabled={importingCsv || contentLoading || !periodReady}
                      onClick={() => csvFileInputRef.current?.click()}
                      className="min-h-9 flex-1 rounded-[var(--radius-button)] border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-800 transition [flex-basis:9rem] enabled:hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 sm:flex-none"
                    >
                      {importingCsv ? "Importando…" : "Importar CSV"}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={!contentReady || transactions.length === 0}
                  onClick={() => {
                    const rows = transactions.map((tx) => {
                      const tipoResolved = tx.tipo ?? (tx.monto > 0 ? ("income" as const) : ("expense" as const))
                      return {
                        fecha: tx.fecha,
                        tipoLabel: tipoResolved === "income" ? ("Ingreso" as const) : ("Gasto" as const),
                        categoria: tx.categoria,
                        subcategoria: tx.subcategoria,
                        cuenta: (tx.cuenta ?? "").trim(),
                        concepto: tx.descripcion,
                        monto: tx.monto,
                      }
                    })
                    const csv = buildTransactionsExportCsv(rows)
                    const suf = tipoFilterUrl ? `-${tipoFilterUrl}` : "-todos"
                    downloadCsv(`movimientos-${month}${suf}.csv`, csv)
                  }}
                  className="min-h-9 w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-xs font-semibold text-orbita-primary transition enabled:hover:bg-orbita-surface-alt disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-1 [flex-basis:10rem]"
                >
                  Exportar vista (CSV)
                </button>
              </div>
              <p className="m-0 text-[10px] leading-relaxed text-orbita-secondary [text-wrap:pretty]">
                Máximo 300 filas por carga. Las filas cuyo par categoría/subcategoría no exista en el catálogo se rechazan (se listan en el aviso
                de importación).
              </p>
            </div>
            </details>
          </Card>
        </>
      ) : periodReady && !contentReady && !contentLoading && !contentError ? (
        <div className="p-6 text-center text-orbita-secondary">
          <p>No hay movimientos disponibles</p>
        </div>
      ) : null}
    </div>
  )
}
