"use client"

import { useMemo } from "react"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

function formatMonthBadge(ym: string) {
  const [ys, ms] = ym.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return ym
  const d = new Date(y, m - 1, 1)
  const short = d.toLocaleDateString("es-CO", { month: "short", year: "numeric" })
  return short.replace(/\.$/, "")
}

type FinanceHeroMonthControlProps = {
  month: string
  onChange: (ym: string) => void
}

/**
 * Selector de mes en el hero de Capital: en móvil (p. ej. iPhone 16 Pro Max) se muestra compacto,
 * alineado a la derecha, con el `input type="month"` nativo encima (opacidad 0) para conservar UX iOS.
 * En `sm+` se muestra el control nativo visible como antes.
 */
export function FinanceHeroMonthControl({ month, onChange }: FinanceHeroMonthControlProps) {
  const badge = useMemo(() => formatMonthBadge(month), [month])

  return (
    <label
      className={cn(
        "grid min-w-0 shrink-0 gap-1",
        "max-sm:ml-auto max-sm:w-fit max-sm:max-w-[min(11.25rem,calc(100dvw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))]",
        "sm:w-auto sm:min-w-[11rem]",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary max-sm:text-right">
        Mes
      </span>

      <div
        className={cn(
          "relative w-full min-w-0 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface shadow-sm",
          "max-sm:overflow-hidden max-sm:min-h-[44px]",
          "sm:min-h-[42px]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-between gap-2 px-3 text-sm font-medium tabular-nums text-orbita-primary sm:hidden"
          aria-hidden
        >
          <span className="min-w-0 truncate">{badge}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-orbita-muted" strokeWidth={2} />
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Seleccionar mes del periodo"
          className={cn(
            "relative z-[1] w-full min-w-0 cursor-pointer rounded-[var(--radius-button)] border-0 bg-transparent text-sm text-transparent",
            "max-sm:opacity-[0.01] sm:opacity-100 sm:text-orbita-primary",
            "min-h-[44px] px-3 py-2 sm:min-h-[42px]",
            "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent-finance)_35%,transparent)]",
            "sm:shadow-none",
          )}
        />
      </div>
    </label>
  )
}
