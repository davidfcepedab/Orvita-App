"use client"

import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronDown } from "lucide-react"

type CheckinSectionProps = {
  /** Ancla para `/checkin#id` (p. ej. scroll desde /hoy). */
  id?: string
  title: string
  subtitle?: string
  icon: LucideIcon
  headerTintClass: string
  iconBoxClass: string
  children: ReactNode
  /** Cabecera clicable y cuerpo plegable. */
  collapsible?: boolean
  /** Solo con `collapsible`: si true, empieza cerrado. */
  defaultCollapsed?: boolean
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
  collapsible = false,
  defaultCollapsed = false,
}: CheckinSectionProps) {
  const [open, setOpen] = useState(!defaultCollapsed)

  const headerInner = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBoxClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 className="text-sm font-semibold leading-tight text-orbita-primary sm:text-base">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-orbita-secondary sm:text-sm">{subtitle}</p> : null}
      </div>
      {collapsible ? (
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-orbita-secondary motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      ) : null}
    </>
  )

  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-orbita-border/90 bg-orbita-surface shadow-card sm:scroll-mt-32"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4 ${headerTintClass} cursor-pointer motion-safe:transition-opacity motion-safe:hover:opacity-95`}
          aria-expanded={open}
        >
          {headerInner}
        </button>
      ) : (
        <div className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 ${headerTintClass}`}>{headerInner}</div>
      )}
      <div className={collapsible && !open ? "hidden" : "border-t border-orbita-border/90"}>
        <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </section>
  )
}
