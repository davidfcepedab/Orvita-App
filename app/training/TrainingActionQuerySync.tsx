"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { TrainingStatus } from "@/src/modules/training/types"

function Inner({ setManualStatus }: { setManualStatus: (s: TrainingStatus) => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  /** Primitivo: `searchParams` puede mantener identidad entre actualizaciones de query en cliente. */
  const action = searchParams.get("action")

  useEffect(() => {
    if (action !== "rest" && action !== "adjust") return undefined

    setManualStatus(action === "rest" ? "rest" : "skip")

    /** `router.replace("/training")` no siempre limpia `?action=` tras navegación cliente en App Router. */
    const id = window.setTimeout(() => {
      window.history.replaceState(window.history.state ?? {}, "", "/training")
      router.replace("/training", { scroll: false })
    }, 0)

    return () => window.clearTimeout(id)
  }, [action, setManualStatus, router])

  return null
}

export function TrainingActionQuerySync({ setManualStatus }: { setManualStatus: (s: TrainingStatus) => void }) {
  return (
    <Suspense fallback={null}>
      <Inner setManualStatus={setManualStatus} />
    </Suspense>
  )
}
