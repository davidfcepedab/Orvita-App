"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

const inputBase =
  "min-h-[44px] w-full rounded-xl border border-orbita-border bg-orbita-surface px-3 text-sm text-orbita-primary shadow-sm outline-none transition focus:border-[color-mix(in_srgb,var(--color-accent-primary)_42%,var(--color-border))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent-primary)_28%,transparent)]"

export function ToggleRow({
  label,
  icon: Icon,
  checked,
  onChange,
  disabled,
}: {
  label: string
  icon?: LucideIcon
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-orbita-border/80 bg-orbita-surface px-3 py-2 shadow-sm sm:min-h-[44px] sm:px-4">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-orbita-primary">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-orbita-secondary" strokeWidth={2} aria-hidden /> : null}
        <span className="leading-snug">{label}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked
            ? "bg-[var(--color-accent-health)]"
            : "bg-[color-mix(in_srgb,var(--color-text-secondary)_38%,var(--color-border))]"
        } ${disabled ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-orbita-surface shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

export function SliderRow({
  label,
  icon: Icon,
  value,
  onChange,
  min = 1,
  max = 10,
  accentClass = "accent-[var(--color-accent-primary)]",
}: {
  label: string
  icon?: LucideIcon
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  accentClass?: string
}) {
  const scale = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-orbita-primary">
          {Icon ? <Icon className="h-4 w-4 text-orbita-secondary" strokeWidth={2} aria-hidden /> : null}
          {label}
        </span>
        <span className="tabular-nums text-sm font-semibold text-[var(--color-accent-primary)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-3 w-full cursor-pointer ${accentClass}`}
      />
      <div className="flex justify-between px-0.5 text-[10px] text-orbita-secondary tabular-nums">
        {scale.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  )
}

export function TimeField({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  icon?: LucideIcon
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orbita-secondary">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className={inputBase} />
    </label>
  )
}

export function TextareaRow({
  label,
  hint,
  icon: Icon,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  hint?: string
  icon?: LucideIcon
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orbita-secondary">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </span>
      {hint ? <p className="text-[11px] leading-snug text-orbita-secondary">{hint}</p> : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${inputBase} min-h-[88px] resize-y py-2.5`}
      />
    </label>
  )
}

export function NumberUnitField({
  label,
  icon: Icon,
  value,
  onChange,
  unit,
  placeholder,
  step,
  disabled,
}: {
  label: string
  icon?: LucideIcon
  value: string
  onChange: (v: string) => void
  unit: string
  placeholder?: string
  step?: string
  disabled?: boolean
}) {
  return (
    <label className={`block space-y-1.5 ${disabled ? "opacity-60" : ""}`}>
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orbita-secondary">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </span>
      <div className="flex min-h-[44px] items-stretch overflow-hidden rounded-xl border border-orbita-border bg-orbita-surface shadow-sm">
        <input
          type="number"
          step={step}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-orbita-primary outline-none focus:ring-0 disabled:bg-orbita-surface-alt"
        />
        <span className="flex items-center border-l border-orbita-border bg-orbita-surface-alt px-3 text-xs font-medium text-orbita-secondary">
          {unit}
        </span>
      </div>
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-orbita-secondary">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputBase}>
        {children}
      </select>
    </label>
  )
}
