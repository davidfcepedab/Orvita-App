"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode } from "@/lib/checkins/flags"

export type FinanceMonthSummary = {
  total_income_current: number
  total_expense_current: number
  balance_current: number
  delta_income: number
  delta_expense: number
  delta_balance: number
}

type Payload = {
  success?: boolean
  summary?: FinanceMonthSummary
  error?: string
}

function currentMonthYm(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Resumen mensual para pulso de capital en /hoy. Falla en silencio si no hay hogar o permisos.
 */
export function useFinanceMonthSummary() {
  const month = useMemo(() => currentMonthYm(new Date()), [])
  const [data, setData] = useState<FinanceMonthSummary | null>(null)
  const [loading, setLoading] = useState(!isAppMockMode())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isAppMockMode()) {
      setData({
        total_income_current: 12_500_000,
        total_expense_current: 8_200_000,
        balance_current: 4_300_000,
        delta_income: 400_000,
        delta_expense: -150_000,
        delta_balance: 280_000,
      })
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await financeApiGet(`/api/orbita/finanzas/summary?month=${month}`)
      const payload = (await res.json()) as Payload
      if (!res.ok || !payload.success || !payload.summary) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setData(payload.summary)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Sin datos de capital")
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, month, refetch: load }
}
