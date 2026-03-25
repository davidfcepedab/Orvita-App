"use client"

import { BriefcaseBusiness, HeartPulse, Home, Landmark, SlidersHorizontal } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { name: "Inicio", route: "/", icon: Home, accent: "var(--text-primary)" },
    { name: "Salud", route: "/salud", icon: HeartPulse, accent: "var(--accent-health-strong)" },
    { name: "Finanzas", route: "/finanzas/overview", icon: Landmark, accent: "var(--accent-finance-strong)" },
    { name: "Coach", route: "/profesional", icon: BriefcaseBusiness, accent: "var(--accent-agenda-strong)" },
    { name: "Sistema", route: "/sistema", icon: SlidersHorizontal, accent: "var(--accent-warning)" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border-soft)] bg-[rgba(255,255,255,0.88)] backdrop-blur-xl shadow-[0_-8px_28px_rgba(15,23,42,0.06)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-1 px-3 py-3 text-center text-xs">

        {tabs.map((tab) => {
          const Icon = tab.icon
          const active =
            pathname === tab.route ||
            (tab.route === "/salud" && pathname === "/fisico") ||
            (tab.route === "/finanzas/overview" && pathname.startsWith("/finanzas"))

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.route)}
              className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl transition"
              style={{
                color: active ? tab.accent : "var(--text-muted)",
                backgroundColor: active ? "rgba(255,255,255,0.72)" : "transparent",
              }}
            >
              <Icon className="h-4 w-4" />
              <span className={active ? "font-semibold" : "font-medium"}>{tab.name}</span>
            </button>
          )
        })}

      </div>
    </div>
  )
}
