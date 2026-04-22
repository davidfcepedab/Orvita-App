"use client"

import type { OrbitaThemeSkin } from "@/app/contexts/AppContext"
import type { ReactNode } from "react"

type Props = {
  title: string
  description?: string
  children: ReactNode
  icon?: ReactNode
  theme: OrbitaThemeSkin
  className?: string
  /**
   * `card`: un solo módulo = una sola tarjeta (encabezado + contenido), como Avisos.
   * `stack`: título y contenido sin borde (p. ej. Avisos con tarjeta interna propia).
   */
  container?: "card" | "stack"
  /**
   * Lista agrupada (estilo Ajustes iOS / filas con separadores, sin cajas internas sueltas).
   * Solo con `container="card"`: el cuerpo es `divide-y` y los hijos directos se separan con líneas.
   * @see https://developer.apple.com/design/human-interface-guidelines/
   */
  listStyle?: "stacked" | "insetGrouped"
}

export function ConfigSettingsSection({
  title,
  description,
  children,
  icon,
  theme,
  className = "",
  container = "card",
  listStyle = "stacked",
}: Props) {
  const listStyleIsInset = container === "card" && listStyle === "insetGrouped"
  const header = (
    <header className="min-w-0">
      <h2
        className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-[0.95rem] font-semibold leading-snug tracking-tight sm:gap-2.5 sm:text-base"
        style={{ color: theme.text }}
      >
        {icon ? (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8"
            style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {description ? (
        <p
          className="m-0 mt-1 max-w-prose text-[11px] leading-relaxed sm:mt-1.5 sm:text-xs"
          style={{ color: theme.textMuted }}
        >
          {description}
        </p>
      ) : null}
    </header>
  )

  if (container === "stack") {
    return (
      <div className={className} style={{ display: "grid", gap: 14 }}>
        {header}
        <div className="min-w-0" style={{ display: "grid", gap: 12 }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_1px_0_rgba(15,23,42,0.04)] ${className}`.trim()}
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <div className="border-b px-4 py-3 sm:px-5 sm:py-3.5" style={{ borderColor: theme.border }}>
        {header}
      </div>
      {listStyleIsInset ? (
        <div
          className="flex min-w-0 flex-col divide-y"
          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
        >
          {children}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4">{children}</div>
        </div>
      )}
    </div>
  )
}
