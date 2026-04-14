"use client"

import { useMemo, useState } from "react"
import { designTokens } from "@/src/theme/design-tokens"

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
  shadow?: string
  hoverShadow?: string
  style?: React.CSSProperties
} & Pick<React.ComponentProps<"div">, "aria-labelledby" | "id" | "role">

export function Card({
  children,
  className,
  hover = false,
  shadow = designTokens.elevation["arctic-soft"] ?? designTokens.elevation.card,
  hoverShadow = designTokens.elevation.hover,
  style,
  ...divRest
}: CardProps) {
  const [isHovering, setIsHovering] = useState(false)

  const resolvedShadow = useMemo(() => {
    if (hover && isHovering) return hoverShadow
    return shadow
  }, [hover, isHovering, shadow, hoverShadow])

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...divRest}
      style={{
        background: "var(--color-surface)",
        border: "0.5px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        boxShadow: resolvedShadow,
        transition:
          "box-shadow calc(300ms * var(--motion-factor, 1)) ease, transform calc(300ms * var(--motion-factor, 1)) ease",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
