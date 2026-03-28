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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={`relative z-[81] max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] border-[0.5px] border-slate-200/90 bg-white shadow-[0_24px_64px_-20px_rgba(15,23,42,0.35)] sm:rounded-[20px] ${
          wide ? "max-w-5xl" : "max-w-lg"
        }`}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-md sm:px-6"
          style={headerTint ? { backgroundImage: headerTint } : undefined}
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
