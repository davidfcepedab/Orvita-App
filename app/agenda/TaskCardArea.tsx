"use client"

import type { CSSProperties, ReactNode } from "react"

type Props = {
  area: string
  iterationMode?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Celda del grid de tarjeta. `area` debe coincidir con grid-template-areas del padre.
 */
export function TaskCardArea({ area, iterationMode, className = "", style, children }: Props) {
  return (
    <div
      data-task-card-area={area}
      className={`relative min-w-0 ${iterationMode ? "outline outline-1 outline-offset-[-1px] outline-[color-mix(in_srgb,var(--color-accent-warning)_65%,transparent)]" : ""} ${className}`.trim()}
      style={{ gridArea: area, ...style }}
    >
      {iterationMode ? (
        <span
          className="pointer-events-none absolute left-0 top-0 z-[1] max-w-[90%] truncate rounded-br bg-[color-mix(in_srgb,var(--color-accent-warning)_88%,#0f172a)] px-0.5 py-px font-mono text-[7px] font-bold uppercase leading-none text-white"
          aria-hidden
        >
          {area}
        </span>
      ) : null}
      {children}
    </div>
  )
}
