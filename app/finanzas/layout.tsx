"use client"

import { useEffect, useState } from "react"
import { useFinance } from "../FinanceContext"
import { useSearchParams } from "next/navigation"

export default function TransactionsClient() {
  const finance = useFinance()

  // Protección cuando context es null (SSR / build)
  if (!finance) return null

  const { month } = finance
  const searchParams = useSearchParams()
  const categoryFilter = searchParams.get("category")

  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!month) return

    let url = `/api/finanzas/transactions?month=${month}`

    if (categoryFilter) {
      url += `&category=${encodeURIComponent(categoryFilter)}`
    }

    fetch(url)
      .then(res => res.json())
      .then(setData)

  }, [month, categoryFilter])

  if (!data) return null

  return (
    <div className="space-y-6">

      {/* Breadcrumb cuando hay filtro */}
      {categoryFilter && (
        <div className="text-sm text-gray-500">
          Categorías &gt; <span className="font-medium">{categoryFilter}</span>
        </div>
      )}

      {/* Renderiza aquí tu tabla/lista de movimientos */}
      {/* Ejemplo simple (adapta según tu table): */}
      {data.transactions?.length > 0 ? (
        <div className="space-y-4">
          {data.transactions.map((tx: any) => (
            <div key={tx.id} className="flex justify-between p-2 border rounded">
              <span>{tx.date}</span>
              <span>{tx.description}</span>
              <span className="font-semibold">
                -${tx.amount.toLocaleString("es-CO")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No hay movimientos para este filtro/mes.
        </p>
      )}

    </div>
  )
}
