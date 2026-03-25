"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../_hooks/useFinance"
import { useSearchParams } from "next/navigation"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category?: string
  subcategory?: string
}

interface TransactionsResponse {
  success: boolean
  data?: {
    transactions: Transaction[]
    subtotal: number
  }
  error?: string
}

export default function TransactionsClient() {
  const finance = useFinance()
  const searchParams = useSearchParams()

  if (!finance) return null

  const month = finance.month
  const categoryFilter = searchParams.get("category")

  const [data, setData] = useState<Transaction[] | null>(null)
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    if (!month) return

    let url = `/api/finanzas/transactions?month=${encodeURIComponent(month)}`
    if (categoryFilter) {
      url += `&category=${encodeURIComponent(categoryFilter)}`
    }

    fetch(url)
      .then(res => res.json())
      .then((json: TransactionsResponse) => {
        if (!json.success) return
        setData(json.data?.transactions ?? [])
        setTotal(json.data?.subtotal ?? 0)
      })
      .catch(() => {
        setData([])
        setTotal(0)
      })
  }, [month, categoryFilter])

  if (data === null) {
    return <p className="text-sm text-gray-400">Cargando movimientos...</p>
  }

  const formatMoney = (amount: number) =>
    amount.toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

  const formatDate = (raw: string) => {
    const date = new Date(raw)
    if (isNaN(date.getTime())) return raw
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {categoryFilter && (
        <div className="text-sm text-gray-500">
          Filtro: <span className="font-medium">{categoryFilter}</span>
        </div>
      )}

      <div>
        <p className="text-sm text-gray-500">Total de movimientos</p>
        <p className="text-2xl font-bold">${formatMoney(total)}</p>
      </div>

      {data.length > 0 ? (
        <div className="space-y-6">
          {data.map((tx) => {
            const isIngreso = tx.amount > 0
            return (
              <div key={tx.id} className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(tx.date)}</p>
                    {tx.category && (
                      <p className="text-xs text-gray-400 mt-1">
                        {tx.category}{tx.subcategory ? ` › ${tx.subcategory}` : ""}
                      </p>
                    )}
                  </div>
                  <p className={`font-semibold ${isIngreso ? "text-green-600" : "text-red-600"}`}>
                    {isIngreso ? "+" : "-"}${formatMoney(Math.abs(tx.amount))}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No hay movimientos para este mes.</p>
      )}
    </div>
  )
}
