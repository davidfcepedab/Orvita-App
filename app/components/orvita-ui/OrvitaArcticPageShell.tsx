"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  children: ReactNode
  className?: string
}

/**
 * Fondo “árctico” sutil: gradiente + grano, encima de tokens del tema.
 * Uso: `/configuracion`, `/health`, `/training` (coherente con HIG + Órvita).
 */
export default function OrvitaArcticPageShell({ children, className }: Props) {
  return <div className={cn("orv-arctic-ambient", className)}>{children}</div>
}
