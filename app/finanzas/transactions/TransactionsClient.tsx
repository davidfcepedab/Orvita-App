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
  total: number
  success: boolean
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

        if (subcategory) {
          url += `&subcategory=${encodeURIComponent(subcategory)}`
        }

        const res = await fetch(url)
        const json = await res.json()

        if (!res.ok || json.success === false) {
          throw new Error(json.error || "Error desconocido")
        }

        setData(json)

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [month, category, subcategory])

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
      <div className="bg-red-50 p-4 rounded-lg text-red-600">
        {error}
      </div>
    )

  if (!data) return null

  return (
    <div className="space-y-4">

      {data.transactions.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>Sin movimientos registrados para este período.</p>
        </div>
      ) : (
        <>
          {data.transactions.map(tx => (
            <div
              key={tx.id}
              className="bg-white p-4 rounded-xl shadow"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.date).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <p className="font-semibold">
                  ${Math.abs(tx.amount).toLocaleString("es-CO")}
                </p>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 p-4 rounded-lg text-blue-600 font-semibold">
            Total: ${Math.abs(data.total).toLocaleString("es-CO")}
          </div>
        </>
      )}

    </div>
  )
}
