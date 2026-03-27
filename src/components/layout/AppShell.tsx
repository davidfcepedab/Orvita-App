"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTheme, useLayoutMode } from "@/src/theme/ThemeProvider"
import { designTokens } from "@/src/theme/design-tokens"
import { Button } from "@/src/components/ui/Button"
import { createBrowserClient } from "@/lib/supabase/browser"
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
  showSidebar?: boolean
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function AppShell({ moduleLabel, moduleTitle, primaryAction, metaInfo, showSidebar = true, children, sidebar }: AppShellProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { layoutMode, setLayoutMode } = useLayoutMode()
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      const rawName =
        data.user?.user_metadata?.full_name ??
        data.user?.user_metadata?.name ??
        data.user?.email?.split("@")[0]
      if (rawName) {
        const firstName = rawName.trim().split(" ")[0]
        setUserName(firstName)
      }
    })
  }, [])

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
          borderBottom: "0.5px solid var(--color-border)",
          background: "color-mix(in srgb, var(--color-surface) 95%, transparent)",
          backdropFilter: "blur(6px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: "1800px", margin: "0 auto", padding: "16px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: "var(--color-accent-health)",
                  }}
                />
                <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>ÓRVITA V3</h1>
                <span
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Strategic Operating System
                </span>
              </div>
              <span style={{ fontSize: "13px", color: "var(--color-text-primary)", paddingLeft: "18px" }}>
                Hola, {userName ?? "Commander"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              <button
                onClick={cycleTheme}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                }}
              >
                <SunMoon size={14} />
                Theme
              </button>

              <button
                onClick={cycleLayout}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                }}
              >
                <PanelLeft size={14} />
                Layout
              </button>

              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "var(--color-text-secondary)",
                }}
              >
                Exportando...
              </button>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setOpen((prev) => !prev)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "0.5px solid var(--color-border)",
                    background: "var(--color-surface-alt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={16} />
                </button>
                {open && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "44px",
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
          </div>
        </div>
      </header>

      <nav
        style={{
          borderBottom: "0.5px solid var(--color-border)",
          background: "var(--color-surface-alt)",
          overflowX: "auto",
        }}
      >
        <div style={{ maxWidth: "1800px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
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
                    gap: "8px",
                    padding: "12px 20px",
                    borderBottom: isActive ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: "1800px",
          margin: "0 auto",
          padding: "32px",
          display: "grid",
          gridTemplateColumns: showSidebar ? "280px 1fr" : "1fr",
          gap: "var(--layout-gap)",
        }}
      >
        {showSidebar && (
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
        )}
        <main style={{ display: "grid", gap: "var(--layout-gap)" }}>{children}</main>
      </div>
    </div>
  )
}
