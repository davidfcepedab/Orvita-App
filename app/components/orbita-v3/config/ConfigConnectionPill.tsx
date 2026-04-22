"use client"

import { Check, Loader2 } from "lucide-react"

type Props = {
  state: "connected" | "disconnected" | "checking" | "disabled"
  /** Etiqueta cuando conectado (p. ej. "Conectado", "Cuentas listas") */
  connectedLabel?: string
  disconnectedLabel?: string
  className?: string
}

/**
 * Resumen visual de conexión (pill pequeña: verde, ámbar tenue, gris).
 */
export function ConfigConnectionPill({
  state,
  connectedLabel = "Conectado",
  disconnectedLabel = "Conectar",
  className = "",
}: Props) {
  if (state === "checking") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`.trim()}
        style={{ backgroundColor: "rgba(148, 163, 184, 0.2)", color: "#64748b" }}
      >
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
        Comprobando…
      </span>
    )
  }
  if (state === "connected") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`.trim()}
        style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "rgb(4, 120, 87)" }}
      >
        <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
        {connectedLabel}
      </span>
    )
  }
  if (state === "disabled") {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`.trim()}
        style={{ backgroundColor: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" }}
      >
        {disconnectedLabel}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`.trim()}
      style={{ backgroundColor: "rgba(251, 191, 36, 0.2)", color: "rgb(180, 83, 9)" }}
    >
      {disconnectedLabel}
    </span>
  )
}
