"use client"

import clsx from "clsx"
import { twMerge } from "tailwind-merge"

type ButtonProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  /** Estilo por defecto: acento primario (CTA). */
  variant?: "primary" | "secondary" | "outline" | "ghost"
  /** `md` equilibra área táctil (44px) en móvil. */
  size?: "sm" | "md" | "lg"
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-[40px] gap-1.5 px-3.5 text-[13px]",
  md: "min-h-[44px] gap-2 px-5 text-sm sm:min-h-[40px]",
  lg: "min-h-[48px] gap-2 px-6 text-base",
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[var(--color-accent-primary)] text-[var(--color-surface)] shadow-sm hover:brightness-[1.05] active:brightness-[0.98]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:bg-[color-mix(in_srgb,var(--color-surface-alt)_88%,var(--color-accent-primary)_12%)]",
  outline:
    "border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]",
}

export function Button({
  children,
  className,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
  size = "md",
}: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center rounded-[var(--radius-button)] font-semibold leading-none tracking-tight",
          "transition-[background-color,border-color,color,opacity,box-shadow,filter] duration-200",
          "orbita-focus-ring",
          "disabled:pointer-events-none disabled:opacity-[0.55]",
          sizeClasses[size],
          variantClasses[variant],
        ),
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
