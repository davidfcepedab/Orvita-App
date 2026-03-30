"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFinance } from "../FinanceContext"
import { useLedgerAccounts } from "../useLedgerAccounts"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface Transaction {
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
  cuenta?: string
  monto: number
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

export default function TransactionsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const finance = useFinance()

  const [data, setData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const month = finance?.month ?? searchParams.get("month") ?? ""
  const category = searchParams.get("category") || ""

  const accountParam = searchParams.get("account")?.trim() ?? ""
  const financeAccountId = UUID_RE.test(accountParam) ? accountParam : ""

  const { accounts: ledgerAccounts } = useLedgerAccounts({ enabled: supabaseEnabled })

  const selectedAccountLabel = useMemo(() => {
    if (!financeAccountId) return ""
    return ledgerAccounts.find((a) => a.id === financeAccountId)?.label ?? financeAccountId
  }, [financeAccountId, ledgerAccounts])

  const setFinanceAccountId = (id: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (id) p.set("account", id)
    else p.delete("account")
    const qs = p.toString()
    router.replace(qs ? `/finanzas/transactions?${qs}` : "/finanzas/transactions")
  }

  useEffect(() => {
    if (!month) {
      setData(null)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        let url = `/api/orbita/finanzas/transactions?month=${encodeURIComponent(month)}`
        if (category) {
          url += `&category=${encodeURIComponent(category)}`
        }
        if (financeAccountId) {
          url += `&finance_account_id=${encodeURIComponent(financeAccountId)}`
        }

        const response = await financeApiGet(url)

        const json: TransactionsResponse = await response.json()

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setData(json.data ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [month, category, financeAccountId])

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  const titleParts = [category || null, financeAccountId ? selectedAccountLabel || "Cuenta" : null].filter(
    Boolean,
  ) as string[]
  const pageTitle = titleParts.length > 0 ? titleParts.join(" · ") : "Consolidado mensual"

  const transactions = data?.transactions ?? []
  const subtotal = data?.subtotal ?? 0
  const previousSubtotal = data?.previousSubtotal ?? 0
  const delta = data?.delta ?? null
  const deltaValue = delta ?? (previousSubtotal ? subtotal - previousSubtotal : 0)

  const periodReady = Boolean(month)
  const contentLoading = periodReady && loading
  const contentError = periodReady && error
  const contentReady = periodReady && !loading && !error && data !== null

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="order-2 w-full min-h-[44px] rounded-full border border-orbita-border bg-orbita-surface px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-orbita-secondary sm:order-none sm:w-auto sm:min-h-0"
        >
          Volver
        </button>
        <div className="order-1 min-w-0 flex-1 text-center sm:order-none sm:flex-none sm:text-left">
          <p className="text-xs uppercase tracking-[0.18em] text-orbita-secondary">Movimientos</p>
          <h1 className="break-words text-xl font-semibold text-orbita-primary sm:text-2xl">{pageTitle}</h1>
          <p className="text-xs text-orbita-secondary">Periodo: {month || "Actual"}</p>
        </div>
        <div className="order-3 flex justify-center sm:order-none sm:justify-end">
          <div className="rounded-full border border-orbita-border bg-orbita-surface-alt px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-orbita-secondary">
            {contentLoading ? "—" : `${transactions.length} registros`}
          </div>
        </div>
      </div>

      {supabaseEnabled ? (
        <div className="grid min-w-0 gap-2 sm:max-w-md">
          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Cuenta (ledger)</span>
            <select
              value={financeAccountId}
              onChange={(e) => setFinanceAccountId(e.target.value)}
              disabled={contentLoading}
              className="min-h-11 w-full rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-3 py-2 text-sm text-orbita-primary disabled:cursor-wait disabled:opacity-60"
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
          <p className="text-[11px] leading-snug text-orbita-secondary">
            Orden según la hoja Cuentas. Compatible con el filtro por categoría en la URL (
            <code className="text-[10px]">?category=</code>
            ).
          </p>
        </div>
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            {[0, 1, 2].map((k) => (
              <Card key={k} hover className="min-w-0 animate-pulse p-4 sm:p-8">
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            <Card hover className="min-w-0 p-4 sm:p-8">
              <div className="grid min-w-0 gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total movimientos</p>
                <p className="break-words text-2xl font-semibold tabular-nums text-orbita-primary">
                  ${Math.abs(subtotal).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-orbita-secondary">Balance del periodo</p>
              </div>
            </Card>
            <Card hover className="min-w-0 p-4 sm:p-8">
              <div className="grid min-w-0 gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Variación mensual</p>
                <p
                  className={`break-words text-2xl font-semibold tabular-nums ${deltaValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {deltaValue >= 0 ? "+" : "-"}$
                  {Math.abs(deltaValue).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-orbita-secondary">vs mes anterior</p>
              </div>
            </Card>
            <Card hover className="min-w-0 p-4 sm:p-8">
              <div className="grid min-w-0 gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Transacciones</p>
                <p className="text-2xl font-semibold tabular-nums text-orbita-primary">{transactions.length}</p>
                <p className="text-xs text-orbita-secondary">Total del periodo</p>
              </div>
            </Card>
          </div>

          {transactions.length === 0 ? (
            <div className="p-6 text-center text-orbita-secondary">
              <p>No hay movimientos para esta selección</p>
            </div>
          ) : (
            <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-orbita-border bg-[var(--color-surface)]">
              <div className="max-h-[min(70vh,56rem)] min-w-0 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-x touch-pan-y">
                <table className="w-full min-w-0 table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead className="sticky top-0 z-[1] border-b border-orbita-border bg-orbita-surface-alt text-[9px] font-semibold uppercase tracking-[0.08em] text-orbita-secondary sm:text-[10px]">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
                    Fecha
                  </th>
                  <th scope="col" className="px-0.5 py-1.5 text-center sm:py-2" title="Tipo">
                    T
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
                  <th scope="col" className="whitespace-nowrap px-1.5 py-1.5 text-right tabular-nums sm:px-2 sm:py-2">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const catLine = [tx.categoria, tx.subcategoria].filter(Boolean).join(" · ")
                  const tipoLabel = tx.monto > 0 ? "Ingreso" : "Egreso"
                  const montoStr = `$${Math.abs(tx.monto).toLocaleString("es-CO", {
                    maximumFractionDigits: 0,
                  })}`
                  const isIngreso = tx.monto > 0
                  const rowBg = isIngreso ? "hover:opacity-95" : "hover:opacity-95"
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
                  return (
                    <tr
                      key={idx}
                      className={`${rowBg} ${rowBorder} last:border-b-0 transition-opacity`}
                      style={rowStyle}
                    >
                      <td className="whitespace-nowrap px-1.5 py-1 align-middle tabular-nums text-orbita-primary sm:px-2 sm:py-1.5">
                        {tx.fecha}
                      </td>
                      <td
                        className={`px-0.5 py-1 align-middle text-center text-[9px] font-bold sm:py-1.5 ${
                          isIngreso ? "text-[var(--color-accent-health)]" : "text-[var(--color-accent-danger)]"
                        }`}
                        title={tipoLabel}
                      >
                        {isIngreso ? "IN" : "EG"}
                      </td>
                      <td
                        className="truncate px-1.5 py-1 align-middle text-orbita-primary sm:px-2 sm:py-1.5"
                        title={catLine}
                      >
                        {catLine}
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
