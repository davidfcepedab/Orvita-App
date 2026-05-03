"use client"

import { X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function CuentasModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
  headerTint,
  compact,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  headerTint?: string
  /** Menos padding y tipografía más chica (editores densos tipo tabla). */
  compact?: boolean
}) {
  if (!open) return null
  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end justify-center sm:items-center",
        compact ? "sm:p-4" : "sm:p-6",
      )}
      role="dialog"
      aria-modal
    >
      <button
        type="button"
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: "color-mix(in srgb, var(--color-text-primary) 38%, transparent)" }}
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={`relative z-[81] min-w-0 max-h-[92vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] border-[0.5px] border-orbita-border/90 bg-orbita-surface shadow-card sm:rounded-[var(--radius-card)] ${
          wide ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div
          className={cn(
            "sticky top-0 z-10 flex items-start justify-between gap-2 border-b backdrop-blur-md",
            compact
              ? "border-orbita-border/60 px-3 py-2.5 sm:px-4 sm:py-2.5"
              : "border-orbita-border px-5 py-4 sm:px-6",
          )}
          style={
            headerTint
              ? { backgroundImage: headerTint }
              : { background: "color-mix(in srgb, var(--color-surface) 94%, transparent)" }
          }
        >
          <div className="min-w-0 pr-1">
            <h2
              className={cn(
                "font-semibold leading-tight text-orbita-primary",
                compact ? "text-base" : "text-lg",
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  "text-orbita-secondary [text-wrap:pretty]",
                  compact ? "mt-0.5 text-[11px] leading-snug sm:text-xs" : "mt-0.5 text-sm",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-full text-orbita-secondary transition hover:bg-orbita-surface-alt hover:text-orbita-primary",
              compact ? "p-1.5" : "p-2",
            )}
            aria-label="Cerrar modal"
          >
            <X className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </div>
        <div
          className={cn(
            compact ? "min-w-0 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-3.5" : "p-5 sm:p-6",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
