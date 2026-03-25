"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFinance } from "../_hooks/useFinance"

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
  delta: number
}

interface TransactionsResponse {
  success: boolean
  data?: TransactionsData
  error?: string
}

export default function FinanzasTransactions() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const finance = useFinance()

  const [data, setData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const month = searchParams.get("month") || finance?.month || ""
  const category = searchParams.get("category") || ""

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
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

        let url = `/api/finanzas/transactions?month=${encodeURIComponent(month)}`
        if (category) {
          url += `&category=${encodeURIComponent(category)}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: TransactionsResponse = await response.json()

        if (!json.success) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json.data ?? null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido"
        setError(errorMessage)
        console.error("Error fetching transactions:", err)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [month, category])

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

  const { transactions, subtotal } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Volver
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {category || "Movimientos"}
        </h1>
        <div />
      </div>

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600 uppercase tracking-wide">Total Movimientos</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">
          ${Math.abs(subtotal).toLocaleString("es-CO", {
            maximumFractionDigits: 0,
          })}
        </p>
        <p className="text-xs text-slate-500 mt-2">{transactions.length} registros</p>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No hay movimientos para esta seleccion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{tx.categoria}</p>
                  {tx.subcategoria && (
                    <p className="text-xs text-slate-600 mt-1">{tx.subcategoria}</p>
                  )}
                  <p className="text-sm text-slate-700 mt-2">{tx.descripcion}</p>
                  <p className="text-xs text-slate-500 mt-2">{tx.fecha}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    ${Math.abs(tx.monto).toLocaleString("es-CO", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className={`text-xs mt-1 ${tx.monto > 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.monto > 0 ? "Ingreso" : "Egreso"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
