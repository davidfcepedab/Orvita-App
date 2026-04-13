"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFinance } from "../FinanceContext"
import { useLedgerAccounts } from "../useLedgerAccounts"
import { Card } from "@/src/components/ui/Card"
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

function categoryOptionList(rows: FinanceSubcategoryCatalogRow[], currentCategory: string): string[] {
  const s = new Set<string>()
  for (const r of rows) {
    if (r.category) s.add(r.category)
  }
  const cur = currentCategory.trim()
  if (cur) s.add(cur)
  return [...s].sort((a, b) => a.localeCompare(b, "es"))
}

function subcategoryOptionList(
  rows: FinanceSubcategoryCatalogRow[],
  category: string,
  currentSub: string,
): string[] {
  const list = rows
    .filter((r) => r.category === category)
    .map((r) => r.subcategory.trim())
    .filter(Boolean)
  const uniq = [...new Set(list)].sort((a, b) => a.localeCompare(b, "es"))
  const cur = currentSub.trim()
  if (cur && !uniq.includes(cur)) return [cur, ...uniq]
  return uniq
}

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

  const [data, setData] = useState<TransactionsData | null>(null)
  const [txRows, setTxRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patchErr, setPatchErr] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [catalogRows, setCatalogRows] = useState<FinanceSubcategoryCatalogRow[]>([])
  const [templateDownloading, setTemplateDownloading] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const selectAllRef = useRef<HTMLInputElement>(null)

  const month = finance?.month ?? searchParams.get("month") ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0
  const category = searchParams.get("category") || ""

  const accountParam = searchParams.get("account")?.trim() ?? ""
  const financeAccountId = UUID_RE.test(accountParam) ? accountParam : ""

  const tipoParamRaw = searchParams.get("tipo")?.trim().toLowerCase() ?? ""
  const tipoFilterUrl: "" | "ingreso" | "gasto" =
    tipoParamRaw === "ingreso" || tipoParamRaw === "income"
      ? "ingreso"
      : tipoParamRaw === "gasto" || tipoParamRaw === "expense"
        ? "gasto"
        : ""

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
    [month, category, financeAccountId, tipoFilterUrl, capitalEpoch],
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
  }, [month, category, financeAccountId, tipoFilterUrl])

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
        fetchTransactionsSilent()
      } catch (e) {
        setPatchErr(e instanceof Error ? e.message : "No se pudo eliminar")
        fetchTransactionsSilent()
      } finally {
        setDeletingId(null)
      }
    },
    [fetchTransactionsSilent, supabaseEnabled],
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
      fetchTransactionsSilent()
    } catch (e) {
      setPatchErr(e instanceof Error ? e.message : "No se pudo eliminar la selección")
      fetchTransactionsSilent()
    } finally {
      setBulkDeleting(false)
    }
  }, [fetchTransactionsSilent, selectedIds, supabaseEnabled])

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
        let msg = `Se importaron ${d?.inserted ?? 0} movimiento(s).`
        const pe = d?.parseErrors ?? []
        if (pe.length > 0) {
          msg += ` ${pe.length} línea(s) con avisos (formato o datos inválidos en esas líneas).`
        }
        const sw = d?.snapshotWarnings
        if (sw?.length) {
          msg += ` Actualización de resúmenes mensuales: ${sw.join("; ")}`
        }
        setImportNotice(msg)
        await loadTransactions({ showLoading: false })
      } catch (e) {
        setPatchErr(e instanceof Error ? e.message : "Error al importar")
      } finally {
        setImportingCsv(false)
      }
    },
    [loadTransactions, supabaseEnabled],
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
    <div className="min-w-0 space-y-5 sm:space-y-7">
      <Card className="min-w-0 overflow-hidden p-0">
        <div className="border-b border-orbita-border/70 bg-orbita-surface-alt/30 px-4 py-2.5 sm:px-5">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
            Filtros
            <span className="ml-2 hidden font-normal normal-case tracking-normal text-orbita-secondary/85 sm:inline">
              · Importar / exportar abajo
            </span>
          </p>
        </div>
        <div className="grid gap-5 px-4 py-4 sm:gap-6 sm:px-5 sm:py-5">
          <div
            className={`grid min-w-0 grid-cols-1 gap-4 sm:gap-5 ${supabaseEnabled ? "lg:grid-cols-12 lg:items-end lg:gap-x-5" : "lg:grid-cols-2 lg:items-end lg:gap-x-5"}`}
          >
            {supabaseEnabled ? (
              <label className="grid min-w-0 gap-1.5 lg:col-span-5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Cuenta (ledger)</span>
                <select
                  value={financeAccountId}
                  onChange={(e) => setFinanceAccountId(e.target.value)}
                  disabled={contentLoading}
                  className="min-h-11 w-full min-w-0 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary disabled:cursor-wait disabled:opacity-60"
                  aria-label="Filtrar por cuenta"
                >
                  <option value="">Todas las cuentas</option>
                  {ledgerAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className={`grid min-w-0 gap-1.5 ${supabaseEnabled ? "lg:col-span-2" : ""}`}>
              <span className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Tipo</span>
              <select
                value={tipoFilterUrl}
                onChange={(e) => setTipoFilter(e.target.value as "" | "ingreso" | "gasto")}
                disabled={contentLoading}
                className="min-h-11 w-full max-w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary disabled:cursor-wait disabled:opacity-60 sm:max-w-xs lg:max-w-none"
                aria-label="Filtrar por ingreso o gasto"
              >
                <option value="">Todos</option>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </label>
            <div className={`grid min-w-0 gap-2 ${supabaseEnabled ? "lg:col-span-5" : "lg:col-span-1"}`}>
              <span className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Importar / exportar</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={templateDownloading}
                  onClick={() => void downloadTemplateXlsx()}
                  className="min-h-10 flex-1 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface-alt px-3 py-2 text-center text-xs font-semibold text-orbita-primary transition [flex-basis:12rem] enabled:hover:bg-orbita-surface disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:min-w-0"
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
                      className="min-h-10 flex-1 rounded-[var(--radius-button)] border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-800 transition [flex-basis:10rem] enabled:hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 sm:flex-none"
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
                  className="min-h-10 w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-xs font-semibold text-orbita-primary transition enabled:hover:bg-orbita-surface-alt disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-1 [flex-basis:11rem]"
                >
                  Exportar vista
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-orbita-secondary [text-wrap:pretty]">
                La plantilla Excel incluye desplegables; para importar aquí, exporta esa hoja como CSV (UTF-8) con la
                misma cabecera que «Exportar vista», o usa el CSV exportado. Máximo 300 filas por carga; se crean
                cuentas nuevas si la etiqueta no existía.
              </p>
            </div>
          </div>
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

      {!periodReady ? (
        <div className="p-6 text-center text-orbita-secondary">
          <p>No hay movimientos disponibles</p>
        </div>
      ) : contentError ? (
        <div
          className="rounded-[var(--radius-card)] border p-4"
          style={{
            background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
            borderColor: "color-mix(in srgb, var(--color-accent-danger) 32%, var(--color-border))",
            color: "var(--color-accent-danger)",
          }}
        >
          <p className="font-semibold">Error al cargar movimientos</p>
          <p className="mt-1 text-sm opacity-90">{error}</p>
        </div>
      ) : contentLoading ? (
        <div className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {[0, 1, 2].map((k) => (
              <Card
                key={k}
                hover
                className={`min-w-0 animate-pulse p-4 sm:p-6 ${k === 2 ? "sm:col-span-2 xl:col-span-1" : ""}`}
              >
                <div className="h-3 w-24 rounded bg-orbita-border" />
                <div className="mt-3 h-8 w-32 rounded bg-orbita-border" />
              </Card>
            ))}
          </div>
          <div className="p-6 text-center text-orbita-secondary">
            <p>Cargando movimientos...</p>
          </div>
        </div>
      ) : !contentReady ? (
        <div className="p-6 text-center text-orbita-secondary">
          <p>No hay movimientos disponibles</p>
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            <Card hover className="min-w-0 p-4 sm:p-6">
              <div className="grid min-w-0 gap-1.5 sm:gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total movimientos</p>
                <p className="break-words text-xl font-semibold tabular-nums text-orbita-primary sm:text-2xl">
                  ${Math.abs(subtotal).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-[11px] text-orbita-secondary sm:text-xs">Balance del periodo</p>
              </div>
            </Card>
            <Card hover className="min-w-0 p-4 sm:p-6">
              <div className="grid min-w-0 gap-1.5 sm:gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Variación mensual</p>
                <p
                  className={`break-words text-xl font-semibold tabular-nums sm:text-2xl ${deltaValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {deltaValue >= 0 ? "+" : "-"}$
                  {Math.abs(deltaValue).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-[11px] text-orbita-secondary sm:text-xs">vs mes anterior</p>
              </div>
            </Card>
            <Card hover className="min-w-0 p-4 sm:p-6 sm:col-span-2 xl:col-span-1">
              <div className="grid min-w-0 gap-1.5 sm:gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Transacciones</p>
                <p className="text-xl font-semibold tabular-nums text-orbita-primary sm:text-2xl">
                  {transactions.length}
                </p>
                <p className="text-[11px] text-orbita-secondary sm:text-xs">Total del periodo</p>
              </div>
            </Card>
          </div>

          {transactions.length === 0 ? (
            <div className="p-6 text-center text-orbita-secondary">
              <p>No hay movimientos para esta selección</p>
            </div>
          ) : (
            <div className="min-w-0 max-w-full overflow-hidden rounded-[var(--radius-card)] border border-orbita-border bg-[var(--color-surface)] shadow-sm">
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
              <div className="max-h-[min(70vh,56rem)] min-w-0 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-x touch-pan-y">
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
                  <thead className="sticky top-0 z-[1] border-b border-orbita-border bg-orbita-surface-alt text-[9px] font-semibold uppercase tracking-[0.08em] text-orbita-secondary sm:text-[10px]">
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
                        Categoría
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
                      const rowBorder = "border-b border-orbita-border/60"
                      const rowStyle = isIngreso
                        ? {
                            background:
                              "color-mix(in srgb, var(--color-accent-health) 14%, var(--color-surface))",
                          }
                        : {
                            background:
                              "color-mix(in srgb, var(--color-accent-danger) 12%, var(--color-surface))",
                          }
                      const editable = Boolean(supabaseEnabled && tx.id)
                      const catOptions = categoryOptionList(catalogRows, tx.categoria)
                      const subOptions = subcategoryOptionList(catalogRows, tx.categoria, tx.subcategoria)

                      return (
                        <tr
                          key={tx.id ?? idx}
                          className={`${rowBorder} last:border-b-0 transition-opacity hover:opacity-95`}
                          style={rowStyle}
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
                                className="w-full max-w-full rounded border border-orbita-border bg-orbita-surface py-0.5 pl-0.5 text-[9px] font-semibold sm:text-[10px]"
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
                              <div className="grid min-w-0 gap-1">
                                <select
                                  aria-label="Categoría"
                                  className="w-full min-w-0 rounded border border-orbita-border bg-orbita-surface px-1 py-0.5 text-[10px] sm:text-[11px]"
                                  value={tx.categoria}
                                  onChange={(e) => {
                                    const newCat = e.target.value
                                    const subs = subcategoryOptionList(catalogRows, newCat, "")
                                    const newSub = subs[0] ?? ""
                                    setTxRows((rs) =>
                                      rs.map((r) =>
                                        r.id === tx.id
                                          ? { ...r, categoria: newCat, subcategoria: newSub }
                                          : r,
                                      ),
                                    )
                                    schedulePatch(tx.id!, {
                                      category: newCat,
                                      subcategory: newSub || null,
                                    })
                                  }}
                                >
                                  {catOptions.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  aria-label="Subcategoría"
                                  className="w-full min-w-0 rounded border border-orbita-border bg-orbita-surface px-1 py-0.5 text-[9px] text-orbita-secondary sm:text-[10px]"
                                  value={tx.subcategoria || ""}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setTxRows((rs) =>
                                      rs.map((r) => (r.id === tx.id ? { ...r, subcategoria: v } : r)),
                                    )
                                    schedulePatch(tx.id!, { subcategory: v || null })
                                  }}
                                >
                                  <option value="">—</option>
                                  {subOptions.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
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
        </>
      )}
    </div>
  )
}
