"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Bell, Loader2 } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { isAppMockMode } from "@/lib/checkins/flags"
import type { OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"

const HOUR_OPTS = Array.from({ length: 24 }, (_, i) => i)
const DOW_OPTS: { v: number; label: string }[] = [
  { v: 0, label: "Domingo" },
  { v: 1, label: "Lunes" },
  { v: 2, label: "Martes" },
  { v: 3, label: "Miércoles" },
  { v: 4, label: "Jueves" },
  { v: 5, label: "Viernes" },
  { v: 6, label: "Sábado" },
]

const subtleBtn =
  "rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"

function ToggleRow({
  theme,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  theme: OrbitaConfigTheme
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: theme.text }}>
          {label}
        </p>
        {description ? (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-8 w-14 shrink-0 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? theme.accent.health : theme.border,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
          style={{ left: checked ? "calc(100% - 1.65rem)" : "0.25rem" }}
        />
      </button>
    </div>
  )
}

function FieldLabel({ theme, children }: { theme: OrbitaConfigTheme; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium" style={{ color: theme.text }}>
      {children}
    </label>
  )
}

export function ConfigNotificationPreferencesPanel({ theme }: { theme: OrbitaConfigTheme }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [draft, setDraft] = useState<OrbitaNotificationPreferences | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await browserBearerHeaders(false)
      const res = await fetch("/api/notifications/preferences", { cache: "no-store", headers })
      const payload = (await res.json()) as {
        success?: boolean
        data?: OrbitaNotificationPreferences
        error?: string
      }
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setDraft(payload.data)
    } catch (e) {
      setDraft(null)
      setError(e instanceof Error ? e.message : "No se pudieron cargar las preferencias")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = useCallback((partial: Partial<OrbitaNotificationPreferences>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev))
    setSuccess(null)
  }, [])

  const save = useCallback(async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const headers = await browserBearerHeaders(true)
      const body = {
        push_enabled_global: draft.push_enabled_global,
        push_checkin_reminder: draft.push_checkin_reminder,
        push_habit_reminder: draft.push_habit_reminder,
        push_commitment_reminder: draft.push_commitment_reminder,
        push_finance_threshold: draft.push_finance_threshold,
        push_agenda_upcoming: draft.push_agenda_upcoming,
        push_training_reminder: draft.push_training_reminder,
        push_digest_morning: draft.push_digest_morning,
        push_weekly_summary: draft.push_weekly_summary,
        push_partner_activity: draft.push_partner_activity,
        finance_savings_threshold_pct: draft.finance_savings_threshold_pct,
        reminder_hour_local: draft.reminder_hour_local,
        digest_hour_local: draft.digest_hour_local,
        weekly_digest_dow: draft.weekly_digest_dow,
        timezone: draft.timezone,
        quiet_hours_start: draft.quiet_hours_start,
        quiet_hours_end: draft.quiet_hours_end,
        email_digest_enabled: draft.email_digest_enabled,
        email_weekly_enabled: draft.email_weekly_enabled,
      }
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: OrbitaNotificationPreferences
        error?: string
      }
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setDraft(payload.data)
      setSuccess("Cambios guardados.")
      window.setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }, [draft])

  const disabled = loading || !draft || saving

  return (
    <section className="space-y-3" aria-labelledby="config-notifications-heading">
      <h3
        id="config-notifications-heading"
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: theme.textMuted }}
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden />
        Notificaciones y alertas
      </h3>

      {isAppMockMode() ? (
        <p className="text-[11px] leading-relaxed" style={{ color: theme.accent.agenda }}>
          Modo demo: las preferencias se muestran con valores por defecto; el guardado no persiste en el servidor.
        </p>
      ) : null}

      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
        }}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            Cargando preferencias…
          </div>
        ) : error && !draft ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: theme.text }}>
              {error}
            </p>
            <button type="button" className={subtleBtn} style={{ borderColor: theme.border, color: theme.text }} onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        ) : draft ? (
          <div className="space-y-5">
            {error ? (
              <p className="text-sm" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="text-sm font-medium" style={{ color: theme.accent.health }}>
                {success}
              </p>
            ) : null}

            <ToggleRow
              theme={theme}
              label="Notificaciones push"
              description="Interruptor general. Si lo apagas, no enviamos push automáticos (la bandeja in-app puede seguir recibiendo avisos según reglas futuras)."
              checked={draft.push_enabled_global}
              disabled={disabled}
              onChange={(v) => update({ push_enabled_global: v })}
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Tipos de aviso
              </p>
              <div className="space-y-1.5">
                <ToggleRow
                  theme={theme}
                  label="Recordatorio de check-in"
                  description="Si no cerraste el día, a la hora que elijas."
                  checked={draft.push_checkin_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_checkin_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Hábitos pendientes"
                  description="Por la mañana, si quedan hábitos programados para hoy."
                  checked={draft.push_habit_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_habit_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Compromisos del hogar"
                  description="Cuando hay compromisos próximos a vencer."
                  checked={draft.push_commitment_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_commitment_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Finanzas: umbral de ahorro"
                  description="Aviso si el ahorro del mes cae por debajo del porcentaje indicado (abajo)."
                  checked={draft.push_finance_threshold}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_finance_threshold: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Agenda (próximos)"
                  description="En desarrollo: requiere enlazar mejor con tu agenda."
                  checked={draft.push_agenda_upcoming}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_agenda_upcoming: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Entrenamiento"
                  description="En desarrollo."
                  checked={draft.push_training_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_training_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Resumen matutino (push)"
                  checked={draft.push_digest_morning}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_digest_morning: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Resumen semanal (push)"
                  checked={draft.push_weekly_summary}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_weekly_summary: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Actividad compartida (pareja)"
                  description="En desarrollo."
                  checked={draft.push_partner_activity}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_partner_activity: v })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel theme={theme}>Hora recordatorio check-in (local)</FieldLabel>
                <select
                  className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.reminder_hour_local}
                  onChange={(e) => update({ reminder_hour_local: Number(e.target.value) })}
                >
                  {HOUR_OPTS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel theme={theme}>Hora digest / hábitos (local)</FieldLabel>
                <select
                  className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.digest_hour_local}
                  onChange={(e) => update({ digest_hour_local: Number(e.target.value) })}
                >
                  {HOUR_OPTS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel theme={theme}>Día del resumen semanal</FieldLabel>
                <select
                  className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.weekly_digest_dow}
                  onChange={(e) => update({ weekly_digest_dow: Number(e.target.value) })}
                >
                  {DOW_OPTS.map((d) => (
                    <option key={d.v} value={d.v}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel theme={theme}>Zona horaria (IANA)</FieldLabel>
                <input
                  type="text"
                  spellCheck={false}
                  className="mt-1.5 w-full rounded-lg border px-2 py-2 font-mono text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.timezone}
                  onChange={(e) => update({ timezone: e.target.value })}
                  placeholder="America/Bogota"
                  autoComplete="off"
                />
                <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
                  Usada para calcular «hoy» en recordatorios y digest.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Horario silencioso (sin push)
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                Deja ambos en «Sin» para no aplicar ventana silenciosa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel theme={theme}>Inicio</FieldLabel>
                  <select
                    className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm"
                    style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                    disabled={disabled}
                    value={draft.quiet_hours_start === null ? "" : String(draft.quiet_hours_start)}
                    onChange={(e) => {
                      const v = e.target.value
                      update({ quiet_hours_start: v === "" ? null : Number(v) })
                    }}
                  >
                    <option value="">Sin</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel theme={theme}>Fin</FieldLabel>
                  <select
                    className="mt-1.5 w-full rounded-lg border px-2 py-2 text-sm"
                    style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                    disabled={disabled}
                    value={draft.quiet_hours_end === null ? "" : String(draft.quiet_hours_end)}
                    onChange={(e) => {
                      const v = e.target.value
                      update({ quiet_hours_end: v === "" ? null : Number(v) })
                    }}
                  >
                    <option value="">Sin</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Finanzas
              </p>
              <div>
                <FieldLabel theme={theme}>Umbral mínimo de ahorro (%)</FieldLabel>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1.5 w-full max-w-[12rem] rounded-lg border px-2 py-2 font-mono text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.finance_savings_threshold_pct === null ? "" : String(draft.finance_savings_threshold_pct)}
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    if (raw === "") {
                      update({ finance_savings_threshold_pct: null })
                      return
                    }
                    const n = Number(raw.replace(",", "."))
                    if (Number.isFinite(n)) update({ finance_savings_threshold_pct: n })
                  }}
                  placeholder="Vacío = no avisar por umbral"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Email (Resend)
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                Solo si el servidor tiene <span className="font-mono text-[10px]">RESEND_API_KEY</span> y un remitente
                válido.
              </p>
              <ToggleRow
                theme={theme}
                label="Copia por correo del resumen matutino"
                checked={draft.email_digest_enabled}
                disabled={disabled}
                onChange={(v) => update({ email_digest_enabled: v })}
              />
              <ToggleRow
                theme={theme}
                label="Copia por correo del resumen semanal"
                checked={draft.email_weekly_enabled}
                disabled={disabled}
                onChange={(v) => update({ email_weekly_enabled: v })}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className={subtleBtn}
                style={{
                  borderColor: theme.accent.health,
                  backgroundColor: theme.accent.health,
                  color: "#fff",
                }}
                disabled={disabled}
                onClick={() => void save()}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
