"use client"

import { useMemo, useState } from "react"
import { designTokens } from "@/src/theme/design-tokens"

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = false }: CardProps) {
  const [isHovering, setIsHovering] = useState(false)

  const shadow = useMemo(() => {
    if (hover && isHovering) return designTokens.elevation.hover
    return designTokens.elevation.card
  }, [hover, isHovering])

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        background: "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        boxShadow: shadow,
        transition: "box-shadow 300ms ease, transform 300ms ease",
      }}
    >
      {children}
    </div>
  )
}
