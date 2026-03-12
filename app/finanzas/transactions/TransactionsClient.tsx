"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { useSearchParams } from "next/navigation"

interface Transaction {
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
  monto: number
}

interface TransactionsResponse {
  transactions: Transaction[]
  subtotal?: number
  error?: string
}

export default function TransactionsClient() {
  const finance = useFinance()
  const searchParams = useSearchParams()
  const month = finance?.month ?? ""
  const category = searchParams.get("category")
  const subcategory = searchParams.get("subcategory")

  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const month = finance?.month
  const categoryFilter = searchParams.get("category")
  const subcategoryFilter = searchParams.get("subcategory")

  useEffect(() => {
    if (!month) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        let url = `/api/finanzas/transactions?month=${encodeURIComponent(month)}`

        if (category) {
          url += `&category=${encodeURIComponent(category)}`
        }

        if (subcategoryFilter) {
          url += `&subcategory=${encodeURIComponent(subcategoryFilter)}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const res = await fetch(url)
        const json = await res.json()

        if (json.error) {
          throw new Error(json.error)
        }

        setData(json)

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [month, categoryFilter, subcategoryFilter])

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

  if (loading) return <p>Cargando...</p>

  if (error)
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Sin movimientos registrados para este período.</p>
      </div>
    )

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb de categoría */}
      {categoryFilter && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <span className="text-gray-500">Filtro: </span>
          <span className="font-medium text-gray-800">
            {categoryFilter}
            {subcategoryFilter && ` › ${subcategoryFilter}`}
          </span>
        </div>
      )}

      {/* Resumen */}
      {hasTransactions && data.subtotal !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total de movimientos</p>
          <p className="text-2xl font-bold text-blue-600">
            ${Math.abs(data.subtotal).toLocaleString("es-CO")}
          </p>
        </div>
      )}

      {/* Transacciones */}
      {hasTransactions ? (
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{tx.descripcion}</p>
                <p className="text-xs text-gray-500 mt-1">{tx.fecha}</p>
                {tx.categoria && (
                  <p className="text-xs text-gray-400 mt-1">
                    {tx.categoria}
                    {tx.subcategoria && ` › ${tx.subcategoria}`}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className={`font-semibold text-lg ${
                  tx.monto < 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {tx.monto < 0 ? "-" : "+"}${Math.abs(tx.monto).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Sin movimientos registrados para este período.
          </p>
        </div>
      )}

    </div>
  )
}
