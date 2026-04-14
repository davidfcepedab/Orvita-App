"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { resolveOrvitaDeepLink } from "@/lib/navigation/orvitaUrlScheme"

function OpenRedirectInner() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = searchParams.get("p") ?? searchParams.get("u") ?? ""
    const loc = resolveOrvitaDeepLink(raw)
    if (loc) {
      /* Hash: más fiable que router.replace en App Router */
      window.location.replace(loc)
      return
    }
    if (raw.trim()) {
      setError("Ruta de enlace no reconocida. Usa p=home o p=checkin/dia (etc.).")
    } else {
      setError("Falta el parámetro p (ej. /open?p=home).")
    }
  }, [searchParams])

  return (
    <main className="mx-auto flex min-h-[50dvh] max-w-md flex-col justify-center gap-3 px-4 py-8 text-center">
      <p className="text-sm text-orbita-secondary">
        {error ? error : "Abriendo enlace…"}
      </p>
    </main>
  )
}

export default function OpenPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50dvh] max-w-md flex-col justify-center px-4 py-8 text-center text-sm text-orbita-secondary">
          Cargando…
        </main>
      }
    >
      <OpenRedirectInner />
    </Suspense>
  )
}
