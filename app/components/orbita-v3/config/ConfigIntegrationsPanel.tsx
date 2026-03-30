"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, Dumbbell, ListTodo } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"

const subtleButton =
  "rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"

function IntegrationCard({
  theme,
  children,
}: {
  theme: OrbitaConfigTheme
  children: ReactNode
}) {
  return (
    <div
      className="rounded-2xl border p-6 sm:p-8"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
      }}
    >
      {children}
    </div>
  )
}

export function ConfigIntegrationsPanel({
  theme,
  googleConnected,
  googleError,
  googleSync,
  connecting,
  disconnectingGoogle,
  syncingCalendar,
  syncingTasks,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncCalendar,
  onSyncTasks,
  hevyConnected,
  hevyChecking,
  hevySyncing,
  hevyMessage,
  onHevySync,
  googleLastSyncAt,
  hevyLastSyncAt,
}: {
  theme: OrbitaConfigTheme
  googleConnected: boolean
  googleError: string | null
  googleSync: string | null
  connecting: boolean
  disconnectingGoogle: boolean
  syncingCalendar: boolean
  syncingTasks: boolean
  onConnectGoogle: () => void
  onDisconnectGoogle: () => void
  onSyncCalendar: () => void
  onSyncTasks: () => void
  hevyConnected: boolean
  hevyChecking: boolean
  hevySyncing: boolean
  hevyMessage: string | null
  onHevySync: () => void
  googleLastSyncAt: string | null
  hevyLastSyncAt: string | null
}) {
  return (
    <section className="space-y-5" aria-labelledby="config-integrations-heading">
      <h3
        id="config-integrations-heading"
        className="text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: theme.textMuted }}
      >
        Integraciones
      </h3>

      <div className="flex flex-col gap-8">
        <IntegrationCard theme={theme}>
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
              aria-hidden
            >
              <CalendarDays className="h-6 w-6" style={{ color: theme.accent.agenda }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold tracking-tight" style={{ color: theme.text }}>
                    Google (Calendar + Tasks)
                  </p>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                    Eventos y tareas enlazados a tu cuenta Google. Importa cambios cuando lo necesites.
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"
                  style={{ color: googleConnected ? theme.accent.health : theme.textMuted }}
                >
                  {googleConnected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-hidden />
                      Conectado
                    </>
                  ) : (
                    "No conectado"
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {!googleConnected ? (
                  <button
                    type="button"
                    onClick={onConnectGoogle}
                    className={subtleButton}
                    style={{ borderColor: theme.border, color: theme.text }}
                    disabled={connecting}
                  >
                    {connecting ? "Conectando…" : "Conectar"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onSyncCalendar}
                      className={subtleButton}
                      style={{ borderColor: theme.border, color: theme.text }}
                      disabled={syncingCalendar}
                    >
                      {syncingCalendar ? "Sincronizando…" : "Sincronizar calendario"}
                    </button>
                    <button
                      type="button"
                      onClick={onSyncTasks}
                      className={subtleButton}
                      style={{ borderColor: theme.border, color: theme.text }}
                      disabled={syncingTasks}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ListTodo className="h-3.5 w-3.5 opacity-80" aria-hidden />
                        {syncingTasks ? "Sincronizando…" : "Sincronizar tareas"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onDisconnectGoogle}
                      className={subtleButton}
                      style={{ borderColor: theme.border, color: theme.textMuted }}
                      disabled={disconnectingGoogle}
                    >
                      {disconnectingGoogle ? "Desconectando…" : "Desconectar"}
                    </button>
                  </>
                )}
              </div>

              {googleSync && (
                <p className="mt-4 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  {googleSync}
                </p>
              )}
              {googleError && (
                <p className="mt-4 text-xs leading-relaxed" style={{ color: theme.accent.finance }}>
                  {googleError}
                </p>
              )}

              <p
                className="mt-6 border-t pt-4 text-[11px] leading-relaxed"
                style={{ color: theme.textMuted, borderColor: theme.border }}
              >
                {formatRelativeSyncAgo(googleLastSyncAt)}
              </p>
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard theme={theme}>
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
              aria-hidden
            >
              <Dumbbell className="h-6 w-6" style={{ color: theme.textMuted }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold tracking-tight" style={{ color: theme.text }}>
                    Hevy (Entrenamiento)
                  </p>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                    Volumen y sesiones para recuperación y vistas de entrenamiento. La API se configura en el servidor.
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"
                  style={{
                    color: hevyChecking || !hevyConnected ? theme.textMuted : theme.accent.health,
                  }}
                >
                  {hevyChecking ? (
                    "Comprobando…"
                  ) : hevyConnected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-hidden />
                      Conectado
                    </>
                  ) : (
                    "No conectado"
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/training"
                  className={`inline-flex items-center justify-center ${subtleButton}`}
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Conectar
                </Link>
                <button
                  type="button"
                  onClick={onHevySync}
                  className={subtleButton}
                  style={{ borderColor: theme.border, color: theme.text }}
                  disabled={hevySyncing || hevyChecking}
                >
                  {hevySyncing ? "Sincronizando…" : "Sincronizar"}
                </button>
              </div>

              {hevyMessage && (
                <p className="mt-4 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  {hevyMessage}
                </p>
              )}

              <p
                className="mt-6 border-t pt-4 text-[11px] leading-relaxed"
                style={{ color: theme.textMuted, borderColor: theme.border }}
              >
                {formatRelativeSyncAgo(hevyLastSyncAt)}
              </p>
            </div>
          </div>
        </IntegrationCard>
      </div>
    </section>
  )
}
