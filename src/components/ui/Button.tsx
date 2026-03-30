"use client"

import { useMemo, useState } from "react"

type ButtonProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function Button({ children, className, onClick, disabled, type = "button" }: ButtonProps) {
  const [isHovering, setIsHovering] = useState(false)

  const background = useMemo(() => {
    if (isHovering && !disabled) {
      return "color-mix(in srgb, var(--color-accent-primary) 95%, var(--color-surface) 5%)"
    }
    return "var(--color-accent-primary)"
  }, [isHovering, disabled])

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        height: "40px",
        padding: "0 20px",
        borderRadius: "var(--radius-button)",
        background,
        color: "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
        fontFamily: "var(--font-sans)",
        fontSize: "14px",
        fontWeight: 600,
        lineHeight: 1.25,
        transition: "background-color 300ms ease, color 300ms ease",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}
