"use client"

import type { ReactNode } from "react"

type Props = {
  kicker: string
  title: string
  subtitle?: string
  /** Una sola h1 en el layout; las vistas usan h2 por defecto. */
  titleAs?: "h1" | "h2"
  titleId?: string
  action?: ReactNode
}

/**
 * Cabecera compacta tipo app: chip + título; el punto animado refuerza sensación “vivo” / gamificada ligera.
 */
export function FinanceViewHeader({ kicker, title, subtitle, titleAs = "h2", titleId, action }: Props) {
  const TitleTag = titleAs
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
          <span
            className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center"
            aria-hidden
          >
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_45%,transparent)] opacity-40 motion-reduce:animate-none"
            />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_65%,var(--color-accent-health))] shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent-finance)_50%,transparent)]" />
          </span>
          {kicker}
        </p>
        <TitleTag
          id={titleId}
          className="mt-1 text-base font-bold leading-tight tracking-tight text-orbita-primary sm:text-[1.05rem]"
        >
          {title}
        </TitleTag>
        {subtitle ? (
          <p className="mt-0.5 hidden max-w-prose text-xs leading-snug text-orbita-secondary sm:block">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{action}</div> : null}
    </div>
  )
}
