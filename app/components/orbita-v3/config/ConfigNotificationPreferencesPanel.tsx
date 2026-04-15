"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Bell, ChevronDown, Loader2, Sparkles } from "lucide-react"
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
  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"

/** Naranja medio: filas «próximamente» (borde + fondo suave). */
const UPCOMING_BORDER = "#ea580c"
const UPCOMING_BG = "rgba(234, 88, 12, 0.1)"
const UPCOMING_DESC = "#c2410c"
const UPCOMING_TRACK_ON = "#f97316"

const LS_NOTIF_GAMIF_SAVED = "orvita:gamif:notif_prefs_saved"

function computeNotificationSetupPoints(
  p: OrbitaNotificationPreferences,
  opts: { hasSavedBonus: boolean },
): { current: number; max: number } {
  const max = 36
  let n = 0
  if (p.push_enabled_global) n += 5
  const core = [
    p.push_checkin_reminder,
    p.push_habit_reminder,
    p.push_commitment_reminder,
    p.push_finance_threshold,
    p.push_digest_morning,
    p.push_weekly_summary,
  ]
  n += core.filter(Boolean).length * 3
  if (p.push_agenda_upcoming || p.push_training_reminder || p.push_partner_activity) n += 1
  if (p.email_digest_enabled || p.email_weekly_enabled) n += 2
  if (p.timezone?.trim().includes("/")) n += 2
  if (p.quiet_hours_start != null && p.quiet_hours_end != null) n += 2
  if (p.finance_savings_threshold_pct != null && p.push_finance_threshold) n += 2
  if (opts.hasSavedBonus) n += 5
  return { current: Math.min(n, max), max }
}

function ToggleRow({
  theme,
  label,
  description,
  checked,
  disabled,
  onChange,
  upcoming,
}: {
  theme: OrbitaConfigTheme
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  /** Aviso aún no disponible: estilo naranja distintivo */
  upcoming?: boolean
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: upcoming ? UPCOMING_BORDER : theme.border,
        backgroundColor: upcoming ? UPCOMING_BG : theme.surfaceAlt,
      }}
    >
      <div className="min-w-0 pr-1">
        <p className="text-[13px] font-medium leading-snug" style={{ color: theme.text }}>
          {label}
        </p>
        {description ? (
          <p
            className="mt-0.5 text-[10px] leading-snug sm:text-[11px]"
            style={{ color: upcoming ? UPCOMING_DESC : theme.textMuted }}
          >
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
        className="relative h-7 w-[3.25rem] shrink-0 rounded-full transition-colors"
        style={{
          backgroundColor: checked
            ? upcoming
              ? UPCOMING_TRACK_ON
              : theme.accent.health
            : theme.border,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
          style={{ left: checked ? "calc(100% - 1.45rem)" : "0.2rem" }}
        />
      </button>
    </div>
  )
}

function FieldLabel({ theme, children }: { theme: OrbitaConfigTheme; children: ReactNode }) {
  return (
    <label className="block text-[11px] font-medium leading-tight" style={{ color: theme.text }}>
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
  /** Panel plegado por defecto */
  const [panelOpen, setPanelOpen] = useState(false)
  /** Bonus +5 pts por haber guardado al menos una vez (persistente) */
  const [hasSavedBonus, setHasSavedBonus] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(LS_NOTIF_GAMIF_SAVED) === "1") {
        setHasSavedBonus(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (error && draft) setPanelOpen(true)
  }, [error, draft])

  const gamification = useMemo(() => {
    if (!draft) return { current: 0, max: 36 }
    return computeNotificationSetupPoints(draft, { hasSavedBonus })
  }, [draft, hasSavedBonus])

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
      let firstTimePersist = false
      try {
        firstTimePersist = window.localStorage.getItem(LS_NOTIF_GAMIF_SAVED) !== "1"
        window.localStorage.setItem(LS_NOTIF_GAMIF_SAVED, "1")
      } catch {
        /* ignore */
      }
      setDraft(payload.data)
      setHasSavedBonus(true)
      setSuccess(firstTimePersist ? "Listo, guardado. +5 pts por cuidar tus avisos." : "Listo, guardado.")
      window.setTimeout(() => setSuccess(null), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }, [draft])

  const disabled = loading || !draft || saving

  return (
    <section className="space-y-2" aria-labelledby="config-notifications-heading">
      {isAppMockMode() ? (
        <p className="text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.accent.agenda }}>
          Vista de prueba: ves valores de ejemplo; al salir del modo demo podrás guardar de verdad.
        </p>
      ) : null}

      <div
        className="rounded-2xl border"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
        }}
      >
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm" style={{ color: theme.textMuted }}>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            Cargando avisos…
          </div>
        ) : error && !draft ? (
          <div className="space-y-3 px-4 py-3">
            <p className="text-sm" style={{ color: theme.text }}>
              {error}
            </p>
            <button type="button" className={subtleBtn} style={{ borderColor: theme.border, color: theme.text }} onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        ) : draft ? (
          <div>
            <button
              type="button"
              id="config-notifications-heading"
              className="orbita-focus-ring flex w-full items-start gap-3 px-4 py-3 text-left sm:items-center"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:mt-0"
                style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
                aria-hidden
              >
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
                    Notificaciones
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                    style={{
                      backgroundColor: theme.surfaceAlt,
                      border: `1px solid ${theme.border}`,
                      color: theme.text,
                    }}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" style={{ color: theme.accent.finance }} aria-hidden />
                    {gamification.current}/{gamification.max} pts
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: theme.textMuted }}>
                  {panelOpen
                    ? "Ocultar opciones"
                    : "Avisos en el teléfono o navegador, horarios y correo — pulsa para configurar"}
                </span>
              </span>
              <ChevronDown
                className={`mt-1 h-5 w-5 shrink-0 transition-transform duration-200 sm:mt-0 ${panelOpen ? "rotate-180" : ""}`}
                style={{ color: theme.textMuted }}
                aria-hidden
              />
            </button>

            {panelOpen ? (
              <div
                className="space-y-4 border-t px-4 pb-4 pt-3"
                style={{ borderColor: theme.border }}
                role="region"
                aria-labelledby="config-notifications-heading"
              >
                <div className="space-y-4">
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
              label="Avisos en este dispositivo"
              description="Si lo desactivas, no te enviamos alertas automáticas al teléfono o al navegador. Lo que pase dentro de la app lo sigues viendo en la campana cuando haya novedades."
              checked={draft.push_enabled_global}
              disabled={disabled}
              onChange={(v) => update({ push_enabled_global: v })}
            />

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Qué te avisamos
              </p>
              <div className="space-y-1">
                <ToggleRow
                  theme={theme}
                  label="Recordar cerrar el día"
                  description="Si aún no dejaste tu registro del día, te escribimos a la hora que elijas abajo."
                  checked={draft.push_checkin_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_checkin_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Hábitos pendientes"
                  description="Por la mañana, si te faltan hábitos previstos para hoy."
                  checked={draft.push_habit_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_habit_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Compromisos en casa"
                  description="Cuando un compromiso del hogar está a punto de vencer."
                  checked={draft.push_commitment_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_commitment_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Si el ahorro baja de tu meta"
                  description="Usa el porcentaje más abajo. Te avisamos si el mes se queda corto respecto a esa meta."
                  checked={draft.push_finance_threshold}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_finance_threshold: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Próximos en tu agenda"
                  description="Próximamente, cuando conectemos mejor con tu calendario."
                  upcoming
                  checked={draft.push_agenda_upcoming}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_agenda_upcoming: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Entrenamiento"
                  description="Próximamente."
                  upcoming
                  checked={draft.push_training_reminder}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_training_reminder: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Resumen de la mañana"
                  description="Vistazo al despertar. La hora la eliges un poco más abajo."
                  checked={draft.push_digest_morning}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_digest_morning: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Resumen de la semana"
                  description="Cierre de la semana el día que marques abajo, a la hora del resumen."
                  checked={draft.push_weekly_summary}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_weekly_summary: v })}
                />
                <ToggleRow
                  theme={theme}
                  label="Novedades con tu pareja"
                  description="Próximamente, cuando activemos el hogar compartido."
                  upcoming
                  checked={draft.push_partner_activity}
                  disabled={disabled || !draft.push_enabled_global}
                  onChange={(v) => update({ push_partner_activity: v })}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <FieldLabel theme={theme}>Hora del recordatorio del día</FieldLabel>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
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
                <FieldLabel theme={theme}>Hora del resumen de la mañana y hábitos</FieldLabel>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
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
                <p className="mt-0.5 text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                  En tu zona horaria (arriba): a esa hora van el resumen de la mañana y los hábitos pendientes.
                </p>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel theme={theme}>Día del resumen semanal</FieldLabel>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
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
                <FieldLabel theme={theme}>Tu zona horaria</FieldLabel>
                <input
                  type="text"
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border px-2 py-1.5 font-mono text-[13px]"
                  style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                  disabled={disabled}
                  value={draft.timezone}
                  onChange={(e) => update({ timezone: e.target.value })}
                  placeholder="p. ej. America/Bogota"
                  autoComplete="off"
                />
                <p className="mt-0.5 text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                  Así calculamos qué día es «hoy» y a qué hora corresponde cada aviso.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                No molestar
              </p>
              <p className="text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                En ese tramo no te enviamos avisos al dispositivo. Elige «No» en ambos si no quieres silenciar.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <FieldLabel theme={theme}>Desde</FieldLabel>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
                    style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                    disabled={disabled}
                    value={draft.quiet_hours_start === null ? "" : String(draft.quiet_hours_start)}
                    onChange={(e) => {
                      const v = e.target.value
                      update({ quiet_hours_start: v === "" ? null : Number(v) })
                    }}
                  >
                    <option value="">No</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel theme={theme}>Hasta</FieldLabel>
                  <select
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
                    style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
                    disabled={disabled}
                    value={draft.quiet_hours_end === null ? "" : String(draft.quiet_hours_end)}
                    onChange={(e) => {
                      const v = e.target.value
                      update({ quiet_hours_end: v === "" ? null : Number(v) })
                    }}
                  >
                    <option value="">No</option>
                    {HOUR_OPTS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Tu meta de ahorro
              </p>
              <div>
                <FieldLabel theme={theme}>Porcentaje mínimo que quieres ahorrar cada mes</FieldLabel>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1 w-full max-w-[11rem] rounded-lg border px-2 py-1.5 text-[13px]"
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
                  placeholder="Opcional"
                />
                <p className="mt-0.5 text-[10px] leading-snug" style={{ color: theme.textMuted }}>
                  Solo cuenta si activaste el aviso «Si el ahorro baja de tu meta». Déjalo vacío si no quieres usar este aviso.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                También por correo
              </p>
              <p className="text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
                Al correo de tu cuenta, si tu equipo tiene activado el envío.
              </p>
              <ToggleRow
                theme={theme}
                label="Enviarme el resumen de la mañana"
                checked={draft.email_digest_enabled}
                disabled={disabled}
                onChange={(v) => update({ email_digest_enabled: v })}
              />
              <ToggleRow
                theme={theme}
                label="Enviarme el resumen de la semana"
                checked={draft.email_weekly_enabled}
                disabled={disabled}
                onChange={(v) => update({ email_weekly_enabled: v })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
              <p className="text-[10px] leading-snug" style={{ color: theme.textMuted }}>
                Más opciones activas y guardar = más puntos (hasta {gamification.max}).
              </p>
            </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
