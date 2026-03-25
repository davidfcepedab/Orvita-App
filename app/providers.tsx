"use client"

import { AppProvider } from "@/app/contexts/AppContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
