"use client"

import { AppProvider } from "@/app/contexts/AppContext"
import { PwaClientEffects } from "@/app/components/PwaClientEffects"
import { InstallPwaCallout } from "@/app/components/InstallPwaCallout"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <PwaClientEffects />
      {children}
      <InstallPwaCallout />
    </AppProvider>
  )
}
