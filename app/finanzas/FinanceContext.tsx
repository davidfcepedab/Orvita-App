"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface FinanceContextValue {
  month: string
  setMonth: (newMonth: string) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const today = new Date().toISOString().slice(0, 7)

  const [month, setMonth] = useState<string>(today)

  return (
    <FinanceContext.Provider value={{ month, setMonth }}>
      {children}
    </FinanceContext.Provider>
  )
}

export const useFinance = (): FinanceContextValue | null => {
  const context = useContext(FinanceContext)
  return context ?? null
}
