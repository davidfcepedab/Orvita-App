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
}

export function ConfigSettingsSection({
  title,
  description,
  children,
  icon,
  theme,
  className = "",
  container = "card",
}: Props) {
  const header = (
    <header className="min-w-0">
      <h2
        className="m-0 flex min-w-0 flex-wrap items-center gap-2.5 text-base font-semibold tracking-tight sm:text-lg"
        style={{ color: theme.text }}
      >
        {icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9"
            style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {description ? (
        <p className="m-0 mt-1.5 max-w-prose text-xs leading-relaxed sm:text-sm" style={{ color: theme.textMuted }}>
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
      <div className="border-b px-4 py-3.5 sm:px-5 sm:py-4" style={{ borderColor: theme.border }}>
        {header}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </div>
  )
}
