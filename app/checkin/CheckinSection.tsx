"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

type CheckinSectionProps = {
  /** Ancla para `/checkin#id` (p. ej. scroll desde /hoy). */
  id?: string
  title: string
  subtitle?: string
  icon: LucideIcon
  headerTintClass: string
  iconBoxClass: string
  children: ReactNode
}

/**
 * Bloque de sección estilo Arctic Zen (cabecera tintada + cuerpo en tarjeta blanca).
 */
export function CheckinSection({
  id,
  title,
  subtitle,
  icon: Icon,
  headerTintClass,
  iconBoxClass,
  children,
}: CheckinSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-card)] sm:scroll-mt-32"
    >
      <div className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 ${headerTintClass}`}>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBoxClass}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-sm font-semibold leading-tight text-slate-900 sm:text-base">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-5 border-t border-slate-100/90 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  )
}
