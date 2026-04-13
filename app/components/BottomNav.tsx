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
      className="orbita-chrome-surface fixed bottom-0 left-0 right-0 z-[100] border-t border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] pb-[env(safe-area-inset-bottom,0px)] shadow-nav"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-0.5 px-1 py-2 text-center text-[11px] leading-tight sm:gap-1 sm:px-3 sm:py-3 sm:text-xs sm:leading-normal">

        {tabs.map((tab) => {
          const Icon = tab.icon
          const saludActive =
            pathname === "/health" ||
            pathname === "/fisico" ||
            pathname === "/salud" ||
            pathname.startsWith("/salud/")
          const active =
            pathname === tab.route ||
            (tab.route === "/health" && saludActive) ||
            (tab.route === "/finanzas/overview" && pathname.startsWith("/finanzas"))

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.route)}
              type="button"
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[14px] transition active:opacity-85 sm:min-h-[52px] sm:gap-1"
              style={{
                color: active ? tab.accent : "var(--color-text-secondary)",
                backgroundColor: active
                  ? "color-mix(in srgb, var(--color-surface-alt) 82%, var(--color-surface))"
                  : "transparent",
                boxShadow: active
                  ? "inset 0 0 0 0.5px color-mix(in srgb, var(--color-border) 65%, transparent)"
                  : "none",
              }}
            >
              <Icon
                className="h-[20px] w-[20px] sm:h-[19px] sm:w-[19px]"
                strokeWidth={active ? 2.4 : 2}
                aria-hidden
              />
              <span className={active ? "font-semibold" : "font-medium"}>{tab.name}</span>
            </button>
          )
        })}

      </div>
    </div>
  )
}
