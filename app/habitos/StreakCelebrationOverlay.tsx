"use client"

import { useEffect, useId, useRef } from "react"
import { Sparkles, Trophy, X } from "lucide-react"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"

export type StreakCelebrationOverlayProps = {
  open: boolean
  payload: StreakCelebrationPayload | null
  onDismiss: () => void
}

export function StreakCelebrationOverlay({ open, payload, onDismiss }: StreakCelebrationOverlayProps) {
  const titleId = useId()
  const descId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onDismiss])

  if (!open || !payload) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-text-primary)_42%,transparent)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[1] w-full max-w-[min(100%,22rem)] motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-300 motion-safe:ease-out motion-reduce:animate-none"
        style={{
          borderRadius: "20px",
          border: "1px solid color-mix(in srgb, var(--color-accent-warning) 45%, var(--color-border))",
          background:
            "linear-gradient(165deg, color-mix(in srgb, var(--color-accent-warning) 22%, var(--color-surface)) 0%, var(--color-surface) 55%, color-mix(in srgb, var(--color-surface-alt) 88%, var(--color-surface)) 100%)",
          boxShadow:
            "0 24px 48px -12px color-mix(in srgb, var(--color-text-primary) 28%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-accent-warning) 18%, transparent)",
        }}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-warning)]"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-accent-warning)_18%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--color-accent-warning)_35%,transparent)] motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500 motion-reduce:animate-none">
            <Trophy className="h-7 w-7 text-[color-mix(in_srgb,var(--color-accent-warning)_95%,#7c2d12)]" strokeWidth={2} aria-hidden />
          </div>

          <p
            id={titleId}
            className="m-0 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-accent-warning)_88%,#78350f)]"
          >
            Superhábito · racha
          </p>
          <p className="m-0 mt-2 text-center text-lg font-semibold leading-snug tracking-tight text-[var(--color-text-primary)] sm:text-xl">
            {payload.habitName}
          </p>
          <p
            id={descId}
            className="m-0 mt-3 text-center text-[15px] font-medium leading-snug text-[var(--color-text-primary)] sm:text-[16px]"
          >
            {payload.message}
          </p>
          <p className="m-0 mt-2 text-center text-[11px] text-[var(--color-text-secondary)]">
            {payload.milestoneDays} días continuos
          </p>

          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-accent-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-surface-alt))] px-4 py-2 text-[11px] font-medium text-[var(--color-text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-warning)]" strokeWidth={2.25} aria-hidden />
              Sigue así — próximos hitos a 15, 30… días
            </span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl bg-[var(--color-accent-health)] py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-health)]"
          >
            Genial
          </button>
        </div>
      </div>
    </div>
  )
}
