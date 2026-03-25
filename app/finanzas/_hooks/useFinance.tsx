"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

interface FinanceContextType {
  month: string
  setMonth: (month: string) => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<string>("")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const today = new Date()
    const currentMonth = today.toISOString().slice(0, 7)
    setMonth(currentMonth)
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return <>{children}</>
  }

  return (
    <FinanceContext.Provider value={{ month, setMonth }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance(): FinanceContextType | null {
  const context = useContext(FinanceContext)
  if (!context) {
    console.warn("useFinance debe ser usado dentro de FinanceProvider")
    return null
  }
  return context
}

export function useFinanceOrThrow(): FinanceContextType {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error("useFinance debe ser usado dentro de FinanceProvider")
  }
  return context
}
