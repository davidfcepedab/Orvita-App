"use client"

import { X } from "lucide-react"
import type { ReactNode } from "react"

export function CuentasModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
  headerTint,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  headerTint?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
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
          className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-orbita-border px-5 py-4 backdrop-blur-md sm:px-6"
          style={
            headerTint
              ? { backgroundImage: headerTint }
              : { background: "color-mix(in srgb, var(--color-surface) 94%, transparent)" }
          }
        >
          <div>
            <h2 className="text-lg font-semibold text-orbita-primary">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-orbita-secondary">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-orbita-secondary transition hover:bg-orbita-surface-alt hover:text-orbita-primary"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
