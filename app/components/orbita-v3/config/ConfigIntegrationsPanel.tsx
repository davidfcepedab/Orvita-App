"use client"

import Link from "next/link"
import { CalendarDays, CheckCircle2, Dumbbell, ListTodo } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { configConnectionActionClass } from "@/lib/config/configSettingsUi"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"

const subtleLegacy =
  "rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"

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
  /** Una sola columna con separadores, pensado para ir dentro de la tarjeta «Conexiones». */
  unified = true,
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
  unified?: boolean
}) {
  const btn = (extra?: string) =>
    [configConnectionActionClass, extra].filter(Boolean).join(" ")

  const body = (
    <div
      className={unified ? "flex flex-col divide-y" : "flex flex-col gap-5"}
      style={{ borderColor: theme.border }}
    >
      <div className={unified ? "pb-5" : ""}>
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
            aria-hidden
          >
            <CalendarDays className="h-6 w-6" style={{ color: theme.accent.agenda }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold tracking-tight" style={{ color: theme.text }}>
                  Google (Calendar + Tasks)
                </p>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  Eventos y tareas. Importa cuando quieras.
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

            <div className="mt-3.5 flex flex-wrap gap-2">
              {!googleConnected ? (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className={btn()}
                  style={{ borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }}
                  disabled={connecting}
                >
                  {connecting ? "Conectando…" : "Conectar Google"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSyncCalendar}
                    className={btn()}
                    style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
                    disabled={syncingCalendar}
                  >
                    {syncingCalendar ? "Sincronizando…" : "Calendario"}
                  </button>
                  <button
                    type="button"
                    onClick={onSyncTasks}
                    className={btn()}
                    style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
                    disabled={syncingTasks}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ListTodo className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      {syncingTasks ? "Sincronizando…" : "Tareas"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onDisconnectGoogle}
                    className={btn()}
                    style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: "transparent" }}
                    disabled={disconnectingGoogle}
                  >
                    {disconnectingGoogle ? "…" : "Desconectar"}
                  </button>
                </>
              )}
            </div>

            {googleSync && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                {googleSync}
              </p>
            )}
            {googleError && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.accent.finance }}>
                {googleError}
              </p>
            )}

            <p className="mt-3 border-t pt-3 text-[11px] leading-relaxed" style={{ color: theme.textMuted, borderColor: theme.border }}>
              {formatRelativeSyncAgo(googleLastSyncAt)}
            </p>
          </div>
        </div>
      </div>

      <div className={unified ? "pt-5" : ""}>
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
            aria-hidden
          >
            <Dumbbell className="h-6 w-6" style={{ color: theme.textMuted }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold tracking-tight" style={{ color: theme.text }}>
                  Hevy
                </p>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  Volumen y sesiones. API en el servidor.
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"
                style={{ color: hevyChecking || !hevyConnected ? theme.textMuted : theme.accent.health }}
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

            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link
                href="/training"
                className={unified ? btn() : `inline-flex items-center justify-center ${subtleLegacy}`}
                style={
                  unified
                    ? { borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }
                    : { borderColor: theme.border, color: theme.text }
                }
              >
                Ver entrenamiento
              </Link>
              <button
                type="button"
                onClick={onHevySync}
                className={unified ? btn() : subtleLegacy}
                style={
                  unified
                    ? { borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }
                    : { borderColor: theme.border, color: theme.text }
                }
                disabled={hevySyncing || hevyChecking}
              >
                {hevySyncing ? "Sincronizando…" : "Sincronizar Hevy"}
              </button>
            </div>

            {hevyMessage && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                {hevyMessage}
              </p>
            )}

            <p className="mt-3 border-t pt-3 text-[11px] leading-relaxed" style={{ color: theme.textMuted, borderColor: theme.border }}>
              {formatRelativeSyncAgo(hevyLastSyncAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (unified) {
    return (
      <div aria-labelledby="config-integrations-core">
        <p
          id="config-integrations-core"
          className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: theme.textMuted }}
        >
          Calendario y gimnasio
        </p>
        <div className="mt-3">{body}</div>
      </div>
    )
  }

  return (
    <section className="space-y-3" aria-labelledby="config-integrations-heading">
      <h3
        id="config-integrations-heading"
        className="text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: theme.textMuted }}
      >
        Integraciones
      </h3>
      {body}
    </section>
  )
}
