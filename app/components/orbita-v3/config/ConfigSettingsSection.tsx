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
}

/**
 * Agrupa bloques con título y guía, sin añadir otro contorno (los paneles internos ya traen su tarjeta).
 */
export function ConfigSettingsSection({ title, description, children, icon, theme, className }: Props) {
  return (
    <div className={className} style={{ display: "grid", gap: 14 }}>
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
      <div className="min-w-0" style={{ display: "grid", gap: 12 }}>
        {children}
      </div>
    </div>
  )
}
