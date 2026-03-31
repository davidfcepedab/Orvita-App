"use client"

import { useCallback, useEffect, useState } from "react"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { useFinance } from "./FinanceContext"

/** Fila alineada con `GET /api/orbita/finanzas/ledger-accounts` (orden ya resuelto en servidor). */
export type LedgerAccountRow = {
  id: string
  label: string
  account_class: string
  nature: string
  credit_limit: number | null
  balance_used: number | null
  balance_available: number | null
  manual_balance: number | null
  manual_balance_on?: string | null
  owner_user_id?: string | null
  sort_order?: number | null
  updated_at?: string
}

type Options = {
  /** Si false, no hace fetch (p. ej. selector desactivado). Por defecto true. */
  enabled?: boolean
}

/**
 * Lista de cuentas ledger del hogar ordenadas (sort_order + tipo + saldo + uso del mes).
 * Usa `ledger-accounts?month=` para que el desempate por uso respete el periodo activo.
 *
 * Consumidores futuros (selectores en Movimientos, etc.): importar el hook y pasar el mismo `month`
 * del contexto de finanzas o `enabled: false` hasta que exista la UI.
 */
export function useLedgerAccounts(options?: Options) {
  const finance = useFinance()
  const month = finance?.month ?? ""
  const enabled = options?.enabled !== false

  const [accounts, setAccounts] = useState<LedgerAccountRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!month || !enabled) {
      setAccounts([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await financeApiGet(
        `/api/orbita/finanzas/ledger-accounts?month=${encodeURIComponent(month)}`,
      )
      const json = (await res.json()) as {
        success?: boolean
        data?: { accounts?: LedgerAccountRow[] }
        notice?: string
        error?: string
      }
      if (!res.ok || !json.success) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      setAccounts(Array.isArray(json.data?.accounts) ? json.data!.accounts! : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando cuentas ledger")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [month, enabled])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    accounts,
    setAccounts,
    loading,
    error,
    refetch,
    month,
    financeReady: Boolean(finance),
  }
}
