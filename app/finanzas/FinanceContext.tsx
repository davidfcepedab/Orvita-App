"use client"

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import type { FinanceModuleMeta } from "@/lib/finanzas/financeModuleMeta"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

export interface FinanceContextType {
  month: string
  setMonth: (month: string) => void
  /**
   * Contador opcional para que vistas de Capital invaliden datos tras reconciliar u otras acciones.
   * Ej.: `touchCapitalData()` tras guardar en `orbita_finance_accounts`.
   */
  capitalDataEpoch: number
  touchCapitalData: () => void
  /** KPI / última TX / referencia — misma lógica que overview, vía GET /api/orbita/finanzas/meta */
  financeMeta: FinanceModuleMeta | null
  financeMetaNotice: string | null
  financeMetaLoading: boolean
}

const FinanceContext = createContext<FinanceContextType | null>(null)

function currentMonthYm(): string {
  const today = new Date()
  return today.toISOString().slice(0, 7)
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  /** Mes activo desde el primer render (evita `""` y peticiones duplicadas al hidratar). */
  const [month, setMonth] = useState<string>(currentMonthYm)
  const [capitalDataEpoch, setCapitalDataEpoch] = useState(0)
  const [financeMeta, setFinanceMeta] = useState<FinanceModuleMeta | null>(null)
  const [financeMetaNotice, setFinanceMetaNotice] = useState<string | null>(null)
  const [financeMetaLoading, setFinanceMetaLoading] = useState(false)
  const metaSeq = useRef(0)

  const touchCapitalData = useCallback(() => {
    setCapitalDataEpoch((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!supabaseEnabled || !month) {
      setFinanceMeta(null)
      setFinanceMetaNotice(null)
      setFinanceMetaLoading(false)
      return
    }

    const seq = ++metaSeq.current
    let cancelled = false

    const run = async () => {
      setFinanceMetaLoading(true)
      setFinanceMetaNotice(null)
      try {
        const response = await financeApiGet(
          `/api/orbita/finanzas/meta?month=${encodeURIComponent(month)}`,
        )
        const json = (await response.json()) as {
          success?: boolean
          error?: string
          notice?: string
          meta?: FinanceModuleMeta | null
        }
        if (cancelled || seq !== metaSeq.current) return
        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }
        if (json.notice) setFinanceMetaNotice(json.notice)
        setFinanceMeta(json.meta ?? null)
      } catch {
        if (cancelled || seq !== metaSeq.current) return
        setFinanceMeta(null)
        setFinanceMetaNotice(null)
      } finally {
        if (!cancelled && seq === metaSeq.current) setFinanceMetaLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [month, capitalDataEpoch])

  const value = useMemo(
    () => ({
      month,
      setMonth,
      capitalDataEpoch,
      touchCapitalData,
      financeMeta,
      financeMetaNotice,
      financeMetaLoading,
    }),
    [month, capitalDataEpoch, touchCapitalData, financeMeta, financeMetaNotice, financeMetaLoading],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextType | null {
  const context = useContext(FinanceContext)
  
  if (!context) {
    console.warn("useFinance debe ser usado dentro de FinanceProvider")
    return null
  }
  
  return context
}

// Hook alternativo que lanza error si no está dentro del provider
export function useFinanceOrThrow(): FinanceContextType {
  const context = useContext(FinanceContext)
  
  if (!context) {
    throw new Error("useFinance debe ser usado dentro de FinanceProvider")
  }
  
  return context
}
