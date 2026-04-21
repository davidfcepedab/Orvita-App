"use client"

import { Info } from "lucide-react"

export function MagicLinkExplanation() {
  return (
    <div
      className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-[#C9D2D4] backdrop-blur-md"
      role="note"
    >
      <p className="flex items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00D4FF]" />
        <span>Te enviamos un enlace seguro a tu correo. Sin recordar contraseña.</span>
      </p>
    </div>
  )
}

