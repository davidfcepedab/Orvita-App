"use client"

import { Award, Crown, Gem, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Cuatro marcas visuales para súper hábito (producto pasa `mark` desde el stack / misión flexible).
 * - crown: referencia clásica
 * - gem: joya / premium
 * - award: logro distintivo
 * - shield: confianza y compromiso
 */
export type SuperHabitMark = "crown" | "gem" | "award" | "shield"

export const SUPER_HABIT_MARK_OPTIONS: { id: SuperHabitMark; label: string; hint: string }[] = [
  { id: "crown", label: "Corona", hint: "Realeza, hito máximo" },
  { id: "gem", label: "Gema", hint: "Joyero, rareza" },
  { id: "award", label: "Galardón", hint: "Logro, mérito" },
  { id: "shield", label: "Escudo", hint: "Protección del compromiso" },
]

const sizeClass: Record<"xs" | "sm" | "md" | "lg" | "hero", string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4 sm:h-[18px] sm:w-[18px]",
  lg: "h-5 w-5 sm:h-[22px] sm:w-[22px]",
  hero: "h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]",
}

type Props = {
  mark: SuperHabitMark
  className?: string
  size?: keyof typeof sizeClass
  /** Solo corona: relleno suave tipo sello. */
  withCrownFill?: boolean
}

export function SuperHabitEmblem({ mark, className, size = "md", withCrownFill }: Props) {
  const sc = sizeClass[size]
  if (mark === "gem") {
    return <Gem className={cn(sc, className)} strokeWidth={2} aria-hidden />
  }
  if (mark === "award") {
    return <Award className={cn(sc, className)} strokeWidth={2} aria-hidden />
  }
  if (mark === "shield") {
    return <ShieldCheck className={cn(sc, className)} strokeWidth={2.25} aria-hidden />
  }
  return (
    <Crown
      className={cn(sc, className)}
      strokeWidth={2.25}
      fill={withCrownFill ? "currentColor" : undefined}
      fillOpacity={withCrownFill ? 0.15 : undefined}
      aria-hidden
    />
  )
}
