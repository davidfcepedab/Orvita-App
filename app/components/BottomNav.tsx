"use client"

import { DollarSign, HeartPulse, Home, Settings, SlidersHorizontal } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Inicio", route: "/", icon: Home, accent: "var(--text-primary)" },
    { name: "Salud", route: "/health", icon: HeartPulse, accent: "var(--accent-health-strong)" },
    { name: "Capital", route: "/finanzas/overview", icon: DollarSign, accent: "var(--accent-finance-strong)" },
    { name: "Decisión", route: "/decision", icon: SlidersHorizontal, accent: "var(--accent-warning)" },
    { name: "Config", route: "/configuracion", icon: Settings, accent: "var(--accent-warning)" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border-soft)] bg-[rgba(255,255,255,0.88)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl shadow-[0_-8px_28px_rgba(15,23,42,0.06)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1 px-2 py-2 text-center text-[11px] sm:px-3 sm:py-3 sm:text-xs">

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
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl transition active:opacity-80 sm:min-h-[52px] sm:gap-1"
              style={{
                color: active ? tab.accent : "var(--text-muted)",
                backgroundColor: active ? "rgba(255,255,255,0.72)" : "transparent",
              }}
            >
              <Icon className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={active ? 2.25 : 2} />
              <span className={active ? "font-semibold" : "font-medium"}>{tab.name}</span>
            </button>
          )
        })}

      </div>
    </div>
  )
}
