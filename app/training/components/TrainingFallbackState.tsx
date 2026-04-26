"use client"

import { AlertCircle } from "lucide-react"

type Props = {
  title: string
  detail: string
  ctaLabel: string
  onAction?: () => void
}

export function TrainingFallbackState({ title, detail, ctaLabel, onAction }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-3">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-finance)]" />
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{detail}</p>
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-primary)] transition hover:opacity-90"
            >
              {ctaLabel}
            </button>
          ) : (
            <p className="m-0 mt-2 text-[11px] font-medium text-[var(--color-text-secondary)]">{ctaLabel}</p>
          )}
        </div>
      </div>
    </div>
  )
}
