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
  footer,
  wide,
  headerTint,
  compact,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Acciones fijas abajo (p. ej. Guardar). El shell va por encima del BottomNav en móvil (z-index). */
  footer?: ReactNode
  wide?: boolean
  headerTint?: string
  /** Menos padding y tipografía más chica (editores densos tipo tabla). */
  compact?: boolean
}) {
  if (!open) return null

  const bodyPadding = compact
    ? "min-w-0 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-3.5"
    : "p-5 sm:p-6"

  const footerPadding = compact
    ? "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 sm:px-4 sm:pb-4"
    : "px-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-6"

  return (
    <div
      className={cn(
        "fixed inset-0 z-[110] flex items-end justify-center sm:items-center",
        "pb-[env(safe-area-inset-bottom,0px)] pt-[max(0.5rem,env(safe-area-inset-top,0px))]",
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
        className={cn(
          "relative z-[111] flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-t-[var(--radius-card)] border-[0.5px] border-orbita-border/90 bg-orbita-surface shadow-card sm:rounded-[var(--radius-card)]",
          "max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom)-env(safe-area-inset-top)-1rem))] sm:max-h-[92vh]",
          wide ? "max-w-5xl" : "max-w-lg",
        )}
      >
        <div
          className={cn(
            "shrink-0 flex items-start justify-between gap-2 border-b backdrop-blur-md",
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

        {footer != null ? (
          <>
            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", bodyPadding)}>{children}</div>
            <div
              className={cn(
                "shrink-0 border-t border-orbita-border/65 bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--color-background))] backdrop-blur-md",
                footerPadding,
              )}
            >
              {footer}
            </div>
          </>
        ) : (
          <div className={cn(bodyPadding, "max-h-[min(92vh,100dvh)] overflow-y-auto overscroll-contain")}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
