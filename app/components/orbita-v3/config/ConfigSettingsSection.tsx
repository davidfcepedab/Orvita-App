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
          className="m-0 flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          style={{ color: theme.text }}
        >
          {icon ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        {description ? (
          <p className="m-0 mt-2 max-w-prose text-sm leading-relaxed" style={{ color: theme.textMuted }}>
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
