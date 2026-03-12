"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { useSearchParams } from "next/navigation"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  total?: number
  success?: boolean
  error?: string
}

export default function TransactionsClient() {
  const finance = useFinance()
  const searchParams = useSearchParams()

  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const month = finance?.month
  const categoryFilter = searchParams.get("category")

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

        if (categoryFilter) {
          url += `&category=${encodeURIComponent(categoryFilter)}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const json: TransactionsResponse = await response.json()

        if (!json.success && json.error) {
          throw new Error(json.error)
        }

        setData(json)
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
  }, [month, categoryFilter])

  if (!finance) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Cargando movimientos...</p>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error al cargar movimientos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  // Sin datos
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No hay datos disponibles</p>
      </div>
    )
  }

  const transactions = data.transactions || []
  const hasTransactions = transactions.length > 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb de categoría */}
      {categoryFilter && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <span className="text-gray-500">Filtro: </span>
          <span className="font-medium text-gray-800">{categoryFilter}</span>
        </div>
      )}

      {/* Resumen */}
      {hasTransactions && data.total !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total de movimientos</p>
          <p className="text-2xl font-bold text-blue-600">
            ${Math.abs(data.total).toLocaleString("es-CO")}
          </p>
        </div>
      )}

      {/* Transacciones */}
      {hasTransactions ? (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{tx.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(tx.date).toLocaleDateString("es-CO")}
                </p>
                {tx.category && (
                  <p className="text-xs text-gray-400 mt-1">{tx.category}</p>
                )}
              </div>

              <div className="text-right">
                <p className={`font-semibold text-lg ${
                  tx.amount < 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {categoryFilter
              ? `No hay movimientos en la categoría "${categoryFilter}" para este mes.`
              : "No hay movimientos registrados para este mes."}
          </p>
        </div>
      )}
    </div>
  )
}
