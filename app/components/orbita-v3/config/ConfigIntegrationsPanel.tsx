"use client"

import Link from "next/link"
import { CalendarDays, Check, CheckCircle2, Dumbbell, ListTodo } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { configConnectionActionClass, configSettingsSectionKickerClass } from "@/lib/config/configSettingsUi"
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
  /** Mostrar solo un bloque (p. ej. acordeones independientes en configuración minimal). */
  only = "all" as "all" | "google" | "hevy",
  /** Título e icono van en el `<summary>`; el cuerpo solo acciones y textos. */
  accordionMode = false,
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
  only?: "all" | "google" | "hevy"
  accordionMode?: boolean
}) {
  const btn = (extra?: string) =>
    [configConnectionActionClass, extra].filter(Boolean).join(" ")

  const linkText = "text-[13px] font-medium"

  const googleRow = (
    <div
      className={
        unified
          ? `px-4 pb-4 sm:px-5 sm:pb-5 ${
              accordionMode && only === "google" ? "pt-2.5 sm:pt-2.5" : "pt-0"
            }`
          : ""
      }
    >
      {accordionMode && only === "google" ? (
        <div className="min-w-0">
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={onSyncCalendar}
                  className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0"
                  style={{ color: theme.text }}
                  disabled={syncingCalendar}
                >
                  <span className={linkText}>{syncingCalendar ? "Sincronizando…" : "Calendario"}</span>
                  <Check
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.5}
                    style={{ color: theme.accent.health }}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={onSyncTasks}
                  className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0"
                  style={{ color: theme.text }}
                  disabled={syncingTasks}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    <span className={linkText}>{syncingTasks ? "Sincronizando…" : "Tareas"}</span>
                  </span>
                  <Check
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.5}
                    style={{ color: theme.accent.health }}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="text-[12px] font-medium underline-offset-2 hover:underline"
                  style={{ color: theme.textMuted }}
                  disabled={disconnectingGoogle}
                >
                  {disconnectingGoogle ? "…" : "Desconectar"}
                </button>
              </div>
            </div>
          )}
          {googleSync ? (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              {googleSync}
            </p>
          ) : null}
          {googleError ? (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.accent.finance }}>
              {googleError}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            {formatRelativeSyncAgo(googleLastSyncAt)}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
            style={{ backgroundColor: theme.surfaceAlt }}
            aria-hidden
          >
            <CalendarDays className="h-5 w-5" style={{ color: theme.accent.agenda }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
              <div>
                <p className="text-sm font-semibold leading-snug tracking-tight" style={{ color: theme.text }}>
                  Google (Calendar + Tasks)
                </p>
                <p className="mt-1 max-w-xl text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
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

            <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
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

            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              {formatRelativeSyncAgo(googleLastSyncAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const hevyRow = (
    <div
      className={
        unified
          ? only === "hevy"
            ? "px-4 pb-1 pt-0 sm:px-5 sm:pb-2 sm:pt-0"
            : "px-4 pb-1 pt-4 sm:px-5 sm:pb-2 sm:pt-5"
          : ""
      }
    >
      {accordionMode && only === "hevy" ? (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/training"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium no-underline transition hover:opacity-90"
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            >
              Ver entrenamiento
            </Link>
          </div>
          {hevyMessage ? (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              {hevyMessage}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            {formatRelativeSyncAgo(hevyLastSyncAt)}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
            style={{ backgroundColor: theme.surfaceAlt }}
            aria-hidden
          >
            <Dumbbell className="h-5 w-5" style={{ color: theme.textMuted }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
              <div>
                <p className="text-sm font-semibold leading-snug tracking-tight" style={{ color: theme.text }}>
                  Hevy
                </p>
                <p className="mt-1 max-w-xl text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
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

            <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
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

            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              {formatRelativeSyncAgo(hevyLastSyncAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const body = (
    <div
      className={unified ? "flex flex-col divide-y" : "flex flex-col gap-5"}
      style={{ borderColor: theme.border }}
    >
      {only === "hevy" ? hevyRow : googleRow}
      {only === "all" ? hevyRow : null}
    </div>
  )

  if (unified) {
    return (
      <div
        className="min-w-0"
        aria-labelledby={only === "all" ? "config-integrations-core" : undefined}
      >
        {only === "all" ? (
          <p
            id="config-integrations-core"
            className={`${configSettingsSectionKickerClass} m-0`}
            style={{ color: theme.textMuted }}
          >
            Calendario y gimnasio
          </p>
        ) : null}
        {body}
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
