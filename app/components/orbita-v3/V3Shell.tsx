"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useApp, useOrbitaSkin } from "@/app/contexts/AppContext"
import {
  Activity,
  Calendar,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  SunMoon,
  Target,
  BriefcaseBusiness,
} from "lucide-react"

export default function V3Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { colorTheme, setColorTheme } = useApp()
  const theme = useOrbitaSkin()

  const cycleTheme = () => {
    const order = ["arctic", "carbon", "sand", "midnight"] as const
    const base = colorTheme === "custom" ? "arctic" : colorTheme
    const idx = order.indexOf(base as (typeof order)[number])
    setColorTheme(order[(idx < 0 ? 0 : idx + 1) % order.length])
  }

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Control" },
    { path: "/hoy", icon: Target, label: "Hoy" },
    { path: "/agenda", icon: Calendar, label: "Agenda" },
    { path: "/habitos", icon: Activity, label: "Hábitos" },
    { path: "/salud", icon: HeartPulse, label: "Salud" },
    { path: "/finanzas/overview", icon: Landmark, label: "Finanzas" },
    { path: "/profesional", icon: BriefcaseBusiness, label: "Coach" },
    { path: "/sistema", icon: SlidersHorizontal, label: "Sistema" },
    { path: "/configuracion", icon: Settings, label: "Config" },
  ]

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <header
        className="border-b sticky top-0 z-20 backdrop-blur-sm"
        style={{
          backgroundColor: colorTheme === "arctic" ? "rgba(255,255,255,0.95)" : theme.surface,
          borderColor: theme.border,
        }}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
                Órvita V3
              </p>
              <h1 className="text-xl tracking-tight">Strategic Operating System</h1>
            </div>
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }}
            >
              <SunMoon className="h-4 w-4" />
              Theme
            </button>
          </div>
        </div>
      </header>

      <nav
        className="border-b overflow-x-auto"
        style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
      >
        <div className="mx-auto flex w-max gap-1 px-3 sm:max-w-[1600px] sm:w-auto sm:px-6">
          {navItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path === "/finanzas/overview" && pathname.startsWith("/finanzas"))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors"
                style={{
                  borderBottomColor: isActive ? theme.text : "transparent",
                  color: isActive ? theme.text : theme.textMuted,
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
