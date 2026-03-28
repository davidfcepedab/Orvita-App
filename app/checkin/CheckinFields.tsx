"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

const inputBase =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"

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
    <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm sm:min-h-[44px] sm:px-4">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} aria-hidden /> : null}
        <span className="leading-snug">{label}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : "active:scale-[0.98]"}`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
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
  accentClass = "accent-violet-600",
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
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {Icon ? <Icon className="h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden /> : null}
          {label}
        </span>
        <span className="tabular-nums text-sm font-semibold text-violet-700">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-3 w-full cursor-pointer ${accentClass}`}
      />
      <div className="flex justify-between px-0.5 text-[10px] text-slate-400 tabular-nums">
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
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className={inputBase} />
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
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </span>
      <div className="flex min-h-[44px] items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <input
          type="number"
          step={step}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none focus:ring-0 disabled:bg-slate-50"
        />
        <span className="flex items-center border-l border-slate-100 bg-slate-50 px-3 text-xs font-medium text-slate-500">
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
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputBase}>
        {children}
      </select>
    </label>
  )
}
