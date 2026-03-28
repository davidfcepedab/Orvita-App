"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/src/theme/ThemeProvider"
import { designTokens } from "@/src/theme/design-tokens"
import { Button } from "@/src/components/ui/Button"
import { createBrowserClient } from "@/lib/supabase/browser"
import {
  Activity,
  Calendar,
  HeartPulse,
  DollarSign,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Target,
  Dumbbell,
  SunMoon,
  User,
  LogOut,
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

export function AppShell({
  moduleLabel,
  moduleTitle,
  primaryAction,
  metaInfo,
  showSidebar = true,
  children,
  sidebar,
}: AppShellProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient() as {
      auth?: {
        getUser?: () => Promise<{
          data?: {
            user?: {
              user_metadata?: {
                full_name?: string
                name?: string
              }
              email?: string
            }
          }
        }>
      }
    }

    if (!supabase?.auth?.getUser) {
      setUserName("Demo User")
      return
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        const rawName =
          data?.user?.user_metadata?.full_name ??
          data?.user?.user_metadata?.name ??
          data?.user?.email ??
          null

        if (!rawName) {
          setUserName("Demo User")
          return
        }

        const firstName = rawName.trim().split(/\s+/)[0]
        setUserName(firstName || "Demo User")
      })
      .catch(() => {
        setUserName("Demo User")
      })
  }, [])

  const cycleTheme = () => {
    const order = ["arctic", "carbon", "sand", "midnight"] as const
    const currentIndex = order.indexOf(theme)
    const next = order[(currentIndex + 1) % order.length]
    setTheme(next)
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const supabase = createBrowserClient() as {
        auth?: { signOut?: () => Promise<{ error?: unknown }> }
      }
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut()
      }
      await fetch("/api/auth/session", { method: "DELETE" })
      window.location.href = "/auth"
    } finally {
      setLoggingOut(false)
    }
  }

  const navItems = useMemo(
    () => [
      { path: "/", label: "Inicio", icon: LayoutDashboard },
      { path: "/hoy", label: "Hoy", icon: Target },
      { path: "/agenda", label: "Agenda", icon: Calendar },
      { path: "/habitos", label: "Hábitos", icon: Activity },
      { path: "/finanzas/overview", label: "Capital", icon: DollarSign },
      { path: "/health", label: "Salud", icon: HeartPulse },
      { path: "/training", label: "Entrenamiento", icon: Dumbbell },
      { path: "/decision", label: "Decisión", icon: SlidersHorizontal },
      { path: "/configuracion", label: "Configuración", icon: Settings },
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
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--spacing-lg)]">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: "var(--color-accent-health)",
                  }}
                />
                <h1 className="m-0 text-base font-medium sm:text-lg">ÓRVITA</h1>
                <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)] sm:inline">
                  Sistema Operativo Estratégico
                </span>
              </div>
              <span className="pl-[18px] text-sm text-[var(--color-text-primary)]">
                Hola, {userName ?? "Commander"}
              </span>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-[var(--spacing-md)]">
              <span className="w-full shrink-0 text-[11px] text-[var(--color-text-secondary)] sm:w-auto sm:text-xs">
                {new Date().toLocaleDateString("es-CO", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              <button
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] sm:min-h-0 sm:px-3 sm:py-1.5"
                onClick={cycleTheme}
                type="button"
              >
                <SunMoon size={14} />
                Tema
              </button>

              <button
                type="button"
                disabled
                title="Próximamente"
                aria-disabled="true"
                className="hidden min-h-[40px] cursor-not-allowed items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)] opacity-60 md:inline-flex md:min-h-0 md:py-1.5"
              >
                Exportar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-primary)] sm:min-h-0 sm:py-1.5"
              >
                <LogOut size={14} />
                {loggingOut ? "Saliendo..." : "Salir"}
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setOpen((prev) => !prev)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] sm:h-9 sm:w-9"
                  aria-label="Menú de usuario"
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
                    <Link
                      href="/health"
                      onClick={() => setOpen(false)}
                      style={{
                        display: "block",
                        padding: "var(--spacing-sm)",
                        borderRadius: "var(--radius-button)",
                        color: "var(--color-text-secondary)",
                        textDecoration: "none",
                        fontSize: "13px",
                      }}
                    >
                      Perfil
                    </Link>
                    <Link
                      href="/configuracion"
                      onClick={() => setOpen(false)}
                      style={{
                        display: "block",
                        padding: "var(--spacing-sm)",
                        borderRadius: "var(--radius-button)",
                        color: "var(--color-text-secondary)",
                        textDecoration: "none",
                        fontSize: "13px",
                      }}
                    >
                      Configuración
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        void handleLogout()
                      }}
                      disabled={loggingOut}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "var(--spacing-sm)",
                        borderRadius: "var(--radius-button)",
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        fontSize: "13px",
                        cursor: loggingOut ? "wait" : "pointer",
                      }}
                    >
                      {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    </button>
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
          background: "var(--color-surface)",
          overflowX: "auto",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6">
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
        className="mx-auto grid max-w-[1400px] gap-[var(--layout-gap)] px-4 pb-10 pt-5 sm:px-6 sm:pt-7 md:px-8"
        style={{
          gridTemplateColumns: showSidebar ? "280px 1fr" : "1fr",
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
                  {moduleLabel ?? "Módulo"}
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale.h1["font-size"],
                    fontWeight: designTokens.typography.scale.h1["font-weight"],
                  }}
                >
                  {moduleTitle ?? "Resumen"}
                </h2>
                {primaryAction && <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>}
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
