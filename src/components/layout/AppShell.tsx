"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { useTheme, useLayoutMode } from "@/src/theme/ThemeProvider"
import { designTokens } from "@/src/theme/design-tokens"
import { Button } from "@/src/components/ui/Button"
import {
  Activity,
  Calendar,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Target,
  BriefcaseBusiness,
  Dumbbell,
  SunMoon,
  PanelLeft,
  User,
} from "lucide-react"

type AppShellProps = {
  moduleLabel?: string
  moduleTitle?: string
  primaryAction?: { label: string; onClick?: () => void }
  metaInfo?: string
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function AppShell({ moduleLabel, moduleTitle, primaryAction, metaInfo, children, sidebar }: AppShellProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { layoutMode, setLayoutMode } = useLayoutMode()
  const [open, setOpen] = useState(false)

  const cycleTheme = () => {
    const next = theme === "arctic" ? "carbon" : theme === "carbon" ? "sand" : "arctic"
    setTheme(next)
  }

  const cycleLayout = () => {
    const next = layoutMode === "balanced" ? "compact" : layoutMode === "compact" ? "zen" : "balanced"
    setLayoutMode(next)
  }

  const navItems = useMemo(
    () => [
      { path: "/", label: "Control", icon: LayoutDashboard },
      { path: "/hoy", label: "Hoy", icon: Target },
      { path: "/agenda", label: "Agenda", icon: Calendar },
      { path: "/habitos", label: "Habitos", icon: Activity },
      { path: "/health", label: "Health", icon: HeartPulse },
      { path: "/training", label: "Training", icon: Dumbbell },
      { path: "/finanzas/overview", label: "Finanzas", icon: Landmark },
      { path: "/profesional", label: "Coach", icon: BriefcaseBusiness },
      { path: "/sistema", label: "Sistema", icon: SlidersHorizontal },
      { path: "/configuracion", label: "Config", icon: Settings },
    ],
    []
  )

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--layout-padding)",
          borderBottom: "0.5px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-button)",
              background: "var(--color-surface-alt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: designTokens.typography.scale.label["font-weight"],
            }}
          >
            O3
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: designTokens.typography.scale.caption["font-size"],
                letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                textTransform: "uppercase",
                color: "var(--color-text-secondary)",
              }}
            >
              ORVITA V3
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: designTokens.typography.scale.h3["font-size"],
                fontWeight: designTokens.typography.scale.h3["font-weight"],
              }}
            >
              Strategic Operating System
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
          <Button onClick={cycleTheme}>
            <SunMoon size={16} />
          </Button>
          <Button onClick={cycleLayout}>
            <PanelLeft size={16} />
          </Button>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setOpen((prev) => !prev)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={18} />
            </button>
            {open && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  minWidth: "160px",
                  background: "var(--color-surface)",
                  border: "0.5px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: designTokens.elevation.card,
                  padding: "var(--spacing-sm)",
                }}
              >
                {[
                  { label: "Perfil" },
                  { label: "Settings" },
                  { label: "Sign out" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "var(--spacing-sm)",
                      borderRadius: "var(--radius-button)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          gap: "var(--spacing-sm)",
          padding: "0 var(--layout-padding)",
          borderBottom: "0.5px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path === "/finanzas/overview" && pathname.startsWith("/finanzas"))
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "var(--spacing-md) var(--spacing-sm)",
                borderBottom: isActive ? "2px solid var(--color-accent-primary)" : "2px solid transparent",
                color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: designTokens.typography.scale["body-sm"]["font-size"],
                textDecoration: "none",
              }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div
        style={{
          maxWidth: designTokens.layout["container-max-width"],
          margin: "0 auto",
          padding: "var(--layout-padding)",
          display: "grid",
          gridTemplateColumns: `280px 1fr`,
          gap: "var(--layout-gap)",
        }}
      >
        <aside
          style={{
            background: "var(--color-surface)",
            borderRight: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            padding: "var(--spacing-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-md)",
          }}
        >
          {sidebar ?? (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: designTokens.typography.scale.caption["font-size"],
                  textTransform: "uppercase",
                  letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                  color: "var(--color-text-secondary)",
                }}
              >
                {moduleLabel ?? "Module"}
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: designTokens.typography.scale.h1["font-size"],
                  fontWeight: designTokens.typography.scale.h1["font-weight"],
                }}
              >
                {moduleTitle ?? "Overview"}
              </h2>
              {primaryAction && (
                <Button onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {metaInfo && (
                <p
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale["body-sm"]["font-size"],
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {metaInfo}
                </p>
              )}
            </>
          )}
        </aside>
        <main style={{ display: "grid", gap: "var(--layout-gap)" }}>{children}</main>
      </div>
    </div>
  )
}
