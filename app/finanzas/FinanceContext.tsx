"use client"

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from "react"

export interface FinanceContextType {
  month: string
  setMonth: (month: string) => void
  /**
   * Contador opcional para que vistas de Capital invaliden datos tras reconciliar u otras acciones.
   * Ej.: `touchCapitalData()` tras guardar en `orbita_finance_accounts`.
   */
  capitalDataEpoch: number
  touchCapitalData: () => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<string>("")
  const [capitalDataEpoch, setCapitalDataEpoch] = useState(0)

  const touchCapitalData = useCallback(() => {
    setCapitalDataEpoch((n) => n + 1)
  }, [])

  // Inicializar con el mes actual
  useEffect(() => {
    const today = new Date()
    const currentMonth = today.toISOString().slice(0, 7) // Formato: YYYY-MM
    setMonth(currentMonth)
  }, [])

  const value = useMemo(
    () => ({ month, setMonth, capitalDataEpoch, touchCapitalData }),
    [month, capitalDataEpoch, touchCapitalData],
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
