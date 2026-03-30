"use client"

import { DollarSign, HeartPulse, Home, Settings, SlidersHorizontal } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Inicio", route: "/", icon: Home, accent: "var(--color-text-primary)" },
    { name: "Salud", route: "/health", icon: HeartPulse, accent: "var(--accent-health-strong)" },
    { name: "Capital", route: "/finanzas/overview", icon: DollarSign, accent: "var(--accent-finance-strong)" },
    { name: "Decisión", route: "/decision", icon: SlidersHorizontal, accent: "var(--accent-warning)" },
    { name: "Config", route: "/configuracion", icon: Settings, accent: "var(--accent-warning)" },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom,0px)] shadow-nav backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
      }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-0.5 px-1 py-2 text-center text-[11px] leading-tight sm:gap-1 sm:px-3 sm:py-3 sm:text-xs sm:leading-normal">

        {tabs.map((tab) => {
          const Icon = tab.icon
          const active =
            pathname === tab.route ||
            (tab.route === "/health" && pathname === "/fisico") ||
            (tab.route === "/finanzas/overview" && pathname.startsWith("/finanzas"))

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.route)}
              type="button"
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-button)] transition active:opacity-80 sm:min-h-[52px] sm:gap-1"
              style={{
                color: active ? tab.accent : "var(--color-text-secondary)",
                backgroundColor: active
                  ? "color-mix(in srgb, var(--color-surface-alt) 65%, var(--color-surface))"
                  : "transparent",
              }}
            >
              <Icon className="h-[18px] w-[18px] sm:h-4 sm:w-4" strokeWidth={active ? 2.25 : 2} aria-hidden />
              <span className={active ? "font-semibold" : "font-medium"}>{tab.name}</span>
            </button>
          )
        })}

      </div>
    </div>
  )
}
