"use client"

import { createContext, useContext, useState } from "react"

const FinanceContext = createContext<any>(null)

export function FinanceProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )

  return (
    <FinanceContext.Provider value={{ month, setMonth }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  return useContext(FinanceContext)
}
