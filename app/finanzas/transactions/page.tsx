"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function FinanzasTransactions() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const month = searchParams.get("month")
  const category =
    searchParams.get("category")

  const [data, setData] =
    useState<any>(null)

  useEffect(() => {
    if (!month) return

    let url =
      `/api/finanzas/transactions?month=${month}`

    if (category) {
      url += `&category=${encodeURIComponent(
        category
      )}`
    }

    fetch(url)
      .then((res) => res.json())
      .then(setData)
  }, [month, category])

  if (!data) return null

  const {
    transactions = [],
    subtotal = 0,
    previousSubtotal = 0,
    delta = 0,
  } = data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(value || 0)

  return (
    <div className="space-y-6">

      {/* 🔹 BREADCRUMB */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() =>
            router.push(
              `/finanzas/categories?month=${month}`
            )
          }
          className="underline"
        >
          Categorías
        </button>
        <span>›</span>
        <span className="text-black font-medium">
          {category || "Todos"}
        </span>
      </div>

      {/* 🔹 SUBTOTAL */}
      {category && (
        <div className="card p-6 space-y-2">
          <p className="text-sm text-gray-500">
            Total {category}
          </p>

          <p className="text-2xl font-semibold">
            ${formatMoney(subtotal)}
          </p>

          <p
            className={`text-sm ${
              delta > 0
                ? "text-red-500"
                : "text-emerald-600"
            }`}
          >
            vs mes anterior:{" "}
            {delta > 0 ? "+" : ""}
            {delta}%
          </p>
        </div>
      )}

      {/* 🔹 LISTADO */}
      {transactions.map(
        (tx: any, i: number) => (
          <div
            key={i}
            className="card p-4 flex justify-between items-center"
          >
            <div>
              <p className="text-xs text-gray-400">
                {tx.fecha}
              </p>

              <p className="font-medium">
                {tx.descripcion}
              </p>

              <p className="text-xs text-gray-500">
                {tx.categoria} |{" "}
                {tx.subcategoria}
              </p>
            </div>

            <p
              className={`font-semibold ${
                tx.monto < 0
                  ? "text-red-500"
                  : "text-emerald-600"
              }`}
            >
              ${formatMoney(tx.monto)}
            </p>
          </div>
        )
      )}
    </div>
  )
}
