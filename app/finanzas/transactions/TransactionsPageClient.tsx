"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"

interface Transaction {
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
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

  const month = searchParams.get("month") || finance?.month || ""
  const category = searchParams.get("category") || ""

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

        const response = await financeApiGet(url)

        const json: TransactionsResponse = await response.json()

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        setData(json.data ?? null)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error fetching transactions:", err)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [month, category])

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando movimientos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar movimientos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No hay movimientos disponibles</p>
      </div>
    )
  }

  const { transactions, subtotal, previousSubtotal, delta } = data
  const deltaValue = delta ?? (previousSubtotal ? subtotal - previousSubtotal : 0)

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          onClick={() => router.back()}
          className="order-2 w-full min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-slate-600 sm:order-none sm:w-auto sm:min-h-0"
        >
          Volver
        </button>
        <div className="order-1 min-w-0 flex-1 text-center sm:order-none sm:flex-none sm:text-left">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Movimientos</p>
          <h1 className="break-words text-xl font-semibold text-slate-900 sm:text-2xl">
            {category || "Consolidado mensual"}
          </h1>
          <p className="text-xs text-slate-500">Periodo: {month || "Actual"}</p>
        </div>
        <div className="order-3 flex justify-center sm:order-none sm:justify-end">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {transactions.length} registros
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <Card hover className="min-w-0 p-4 sm:p-8">
          <div className="grid min-w-0 gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total movimientos</p>
            <p className="break-words text-2xl font-semibold tabular-nums text-slate-900">
              ${Math.abs(subtotal).toLocaleString("es-CO", {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-slate-500">Balance del periodo</p>
          </div>
        </Card>
        <Card hover className="min-w-0 p-4 sm:p-8">
          <div className="grid min-w-0 gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Variación mensual</p>
            <p className={`break-words text-2xl font-semibold tabular-nums ${deltaValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {deltaValue >= 0 ? "+" : "-"}${Math.abs(deltaValue).toLocaleString("es-CO", {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-slate-500">vs mes anterior</p>
          </div>
        </Card>
        <Card hover className="min-w-0 p-4 sm:p-8">
          <div className="grid min-w-0 gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Transacciones</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{transactions.length}</p>
            <p className="text-xs text-slate-500">Total del periodo</p>
          </div>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No hay movimientos para esta seleccion</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx, idx) => (
            <Card key={idx} hover className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{tx.categoria}</p>
                    {tx.subcategoria && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {tx.subcategoria}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-700">{tx.descripcion}</p>
                  <p className="mt-2 text-xs text-slate-500">{tx.fecha}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="tabular-nums text-lg font-semibold text-slate-900">
                    ${Math.abs(tx.monto).toLocaleString("es-CO", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p
                    className={`text-[11px] uppercase tracking-[0.14em] mt-1 ${
                      tx.monto > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {tx.monto > 0 ? "Ingreso" : "Egreso"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
