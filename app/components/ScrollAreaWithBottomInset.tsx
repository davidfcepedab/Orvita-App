"use client"

import clsx from "clsx"
import { usePathname } from "next/navigation"

/** Reserva espacio para `BottomNav` fijo; en `/auth` no aplica porque el nav está oculto. */
export function ScrollAreaWithBottomInset({ children }: { children: React.ReactNode }) {
  const hideInset = usePathname().startsWith("/auth")
  return (
    <div
      className={clsx(
        "min-w-0 max-w-full w-full overflow-x-hidden",
        !hideInset && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      {children}
    </div>
  )
}
