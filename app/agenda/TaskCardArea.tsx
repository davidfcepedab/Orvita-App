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
  const guideClass = iterationMode
    ? "box-border min-h-[2.5rem] w-full min-w-0 self-stretch rounded-md border border-dashed border-[color-mix(in_srgb,var(--color-accent-warning)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_7%,transparent)] px-1.5 pb-1.5 pt-5"
    : ""

  return (
    <div
      data-task-card-area={area}
      className={`relative min-w-0 ${guideClass} ${className}`.trim()}
      style={{ gridArea: area, ...style }}
    >
      {iterationMode ? (
        <span
          className="pointer-events-none absolute left-1 top-1 z-[1] max-w-[calc(100%-8px)] truncate rounded bg-[color-mix(in_srgb,var(--color-accent-warning)_88%,#0f172a)] px-1 py-0.5 font-mono text-[7px] font-bold uppercase leading-none text-white"
          aria-hidden
        >
          {area}
        </span>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
