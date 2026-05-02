"use client"

import { useMemo } from "react"
import { CalendarDays } from "lucide-react"
import { formatYmShortMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { cn } from "@/lib/utils"

function formatMonthBadge(ym: string) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym.trim())) return ym
  return formatYmShortMonthYearEsCo(ym.trim())
}

type FinanceHeroMonthControlProps = {
  month: string
  onChange: (ym: string) => void
}

/** Selector de mes compacto: pill con icono + fecha; `input type="month"` captura toques en toda el área. */
export function FinanceHeroMonthControl({ month, onChange }: FinanceHeroMonthControlProps) {
  const badge = useMemo(() => formatMonthBadge(month), [month])

  return (
    <label
      className={cn(
        "relative inline-flex min-h-[36px] shrink-0 cursor-pointer items-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_58%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] px-2.5 py-1 shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)] sm:min-h-[38px] sm:px-3",
        "max-sm:max-w-[min(11rem,calc(100dvw-2rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))]",
        "focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)] focus-within:ring-offset-1 focus-within:ring-offset-[var(--color-surface)]",
      )}
    >
      <span className="sr-only">Seleccionar mes del periodo</span>
      <CalendarDays className="pointer-events-none mr-1.5 h-3.5 w-3.5 shrink-0 text-orbita-secondary opacity-80 sm:h-4 sm:w-4" aria-hidden strokeWidth={2} />
      <span className="pointer-events-none min-w-0 truncate text-[11px] font-semibold tabular-nums text-orbita-primary sm:text-xs">
        {badge}
      </span>
      <input
        type="month"
        value={month}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Seleccionar mes del periodo"
        className="absolute inset-0 z-[1] cursor-pointer opacity-0 focus-visible:outline-none"
      />
    </label>
  )
}
