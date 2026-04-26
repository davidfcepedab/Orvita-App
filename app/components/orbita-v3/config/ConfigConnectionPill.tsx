"use client"

import { AlertCircle, Check, Loader2 } from "lucide-react"

type Props = {
  state: "connected" | "disconnected" | "checking" | "disabled" | "error"
  /** Etiqueta cuando conectado (p. ej. "Conectado", "Cuentas listas") */
  connectedLabel?: string
  disconnectedLabel?: string
  /** Cuando `state="error"`: texto en la píldora (p. ej. "Revisar", "Error"). */
  errorLabel?: string
  className?: string
  /**
   * Convierte la pill "desconectado" en botón (p. ej. sincronizar al tocar "Conectar").
   * En `<summary>`, el clic no debe abrir el acordeón: usa `stopEvent`.
   */
  onDisconnectedClick?: () => void
  stopEventOnDisconnectedClick?: boolean
}

/**
 * Resumen visual de conexión (pill pequeña: verde, ámbar tenue, gris).
 */
export function ConfigConnectionPill({
  state,
  connectedLabel = "Conectado",
  disconnectedLabel = "Conectar",
  errorLabel = "Atención",
  className = "",
  onDisconnectedClick,
  stopEventOnDisconnectedClick = true,
}: Props) {
  if (state === "error") {
    return (
      <span
        className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:max-w-xs ${className}`.trim()}
        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "rgb(185, 28, 28)" }}
        title={errorLabel}
      >
        <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2.2} aria-hidden />
        <span className="min-w-0 truncate">{errorLabel}</span>
      </span>
    )
  }
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
  if (onDisconnectedClick) {
    return (
      <button
        type="button"
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-90 ${className}`.trim()}
        style={{ backgroundColor: "rgba(251, 191, 36, 0.2)", color: "rgb(180, 83, 9)" }}
        onClick={(e) => {
          if (stopEventOnDisconnectedClick) {
            e.preventDefault()
            e.stopPropagation()
          }
          onDisconnectedClick()
        }}
      >
        {disconnectedLabel}
      </button>
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
