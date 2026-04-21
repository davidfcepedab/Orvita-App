"use client"

import type { ReactNode } from "react"

export function AppleStyleButton({
  children,
  icon,
  variant = "glass",
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  icon?: ReactNode
  variant?: "glass" | "black" | "light"
  disabled?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  const base =
    "min-h-11 w-full rounded-[18px] px-4 py-3 text-[15px] font-semibold tracking-[-0.01em] transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
  const variantClass =
    variant === "black"
      ? "bg-black/90 text-white shadow-[0_10px_30px_-14px_rgba(0,0,0,0.85)]"
      : variant === "light"
        ? "bg-white text-[#101214] shadow-[0_10px_24px_-16px_rgba(255,255,255,0.75)]"
        : "border border-white/20 bg-white/[0.08] text-white backdrop-blur-xl shadow-[0_14px_32px_-20px_rgba(0,0,0,0.95)]"

  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel} className={`${base} ${variantClass}`}>
      <span className="flex items-center justify-center gap-2.5">
        {icon ? <span className="opacity-95">{icon}</span> : null}
        <span>{children}</span>
      </span>
    </button>
  )
}

