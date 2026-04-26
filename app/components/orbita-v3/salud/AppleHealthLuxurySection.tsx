"use client"

import { useCallback, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Apple, ClipboardCopy, MoonStar, Sparkles, Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { buildOrvitaRunShortcutHref } from "@/lib/shortcuts/orvitaHealthShortcut"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  loading: boolean
  onRefresh: () => Promise<void>
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "Aún no hay sincronización"
  try {
    return new Intl.DateTimeFormat("es-LA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function recoveryNarrative(readiness: number | null | undefined, weekAvg: number) {
  if (readiness === null || readiness === undefined) {
    return "Cuando conectes Apple Health, aquí verás una lectura clara de tu recuperación y cómo se alinea con tu semana."
  }
  const delta = Math.round(readiness - weekAvg)
  if (delta <= -8) {
    return `Tu recuperación está en ${readiness}: un poco por debajo de tu promedio semanal (${Math.round(weekAvg)}). Vale la pena proteger el sueño y bajar el ritmo hoy.`
  }
  if (delta >= 8) {
    return `Tu recuperación está en ${readiness}: por encima de tu promedio semanal (${Math.round(weekAvg)}). Buen momento para aprovechar energía, sin olvidar descansar.`
  }
  return `Tu recuperación está en ${readiness}, en línea con tu promedio semanal (${Math.round(weekAvg)}). Mantén hábitos simples: sueño constante, hidratación y movimiento amable.`
}

export default function AppleHealthLuxurySection({ salud, latest, loading, onRefresh }: Props) {
  const theme = useOrbitaSkin()
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const panel = useMemo(() => saludPanelStyle(theme, 0.9), [theme])
  const innerGlow = useMemo(
    () => ({
      background: `radial-gradient(120% 80% at 20% 0%, ${saludHexToRgba(theme.accent.agenda, 0.14)}, transparent 55%), radial-gradient(90% 70% at 100% 20%, ${saludHexToRgba(theme.accent.health, 0.12)}, transparent 50%)`,
    }),
    [theme],
  )

  const weekAvg = useMemo(() => {
    const r = salud.trendAverage || salud.scoreSalud
    return typeof r === "number" && r > 0 ? r : salud.scoreSalud || 60
  }, [salud.scoreSalud, salud.trendAverage])

  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const staleSync = useMemo(() => {
    if (!latest?.observed_at) return false
    const ageMs = Date.now() - new Date(latest.observed_at).getTime()
    return Number.isFinite(ageMs) && ageMs > 36 * 60 * 60 * 1000
  }, [latest?.observed_at])

  const mintToken = useCallback(async () => {
    setMinting(true)
    setToast(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/import-token", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMinutes: 60 * 24 }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        import_token?: string
        expires_at?: string
        error?: string
      }
      if (!res.ok || !payload.success || !payload.import_token) {
        throw new Error(payload.error ?? "No se pudo generar el token")
      }
      setToken(payload.import_token)
      setTokenUntil(payload.expires_at ?? null)
      setToast("Token listo: cópialo y pégalo en el Atajo cuando te lo pida.")
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo generar el token")
    } finally {
      setMinting(false)
    }
  }, [])

  const copyToken = useCallback(async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setToast("Token copiado al portapapeles.")
    } catch {
      setToast("No se pudo copiar automáticamente; selecciona el token a mano.")
    }
  }, [token])

  const syncChip = useMemo(() => {
    if (!latest?.observed_at) {
      return {
        label: "Apple Health · sin sync",
        border: theme.border,
        bg: saludHexToRgba(theme.surfaceAlt, 0.85),
        color: theme.textMuted,
      }
    }
    if (staleSync) {
      return {
        label: `Apple Health · ${formatWhen(latest.observed_at)} · desactualizado`,
        border: saludHexToRgba(theme.accent.agenda, 0.45),
        bg: saludHexToRgba(theme.accent.agenda, 0.12),
        color: theme.accent.agenda,
      }
    }
    return {
      label: `Apple Health · ${formatWhen(latest.observed_at)} · al día`,
      border: saludHexToRgba(theme.accent.health, 0.45),
      bg: saludHexToRgba(theme.accent.health, 0.12),
      color: theme.accent.health,
    }
  }, [latest?.observed_at, staleSync, theme])

  if (salud.loading) {
    return (
      <div
        className="rounded-[32px] border p-8 text-sm backdrop-blur-2xl"
        style={{ ...panel, color: theme.textMuted }}
      >
        Estamos preparando tu panel de salud…
      </div>
    )
  }

  if (salud.error) {
    return (
      <div className="rounded-[32px] border border-red-400/40 bg-red-500/10 p-8 text-sm text-red-700 backdrop-blur-2xl dark:text-red-100">
        {salud.error}
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-[32px] border p-7 backdrop-blur-2xl sm:p-10"
      style={panel}
    >
      <div className="pointer-events-none absolute inset-0" style={innerGlow} />

      <div className="relative flex flex-col gap-8" style={{ color: theme.text }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: theme.textMuted }}>
              Apple Health
            </p>
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-4xl">
              Datos automáticos, con calma y precisión
            </h1>
            <p className="text-[15px] leading-relaxed sm:text-base" style={{ color: theme.textMuted }}>
              Apple no lista Órvita en “Apps”: es normal. Usa el Atajo y aquí verás lectura + acción.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: theme.textMuted }}>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{
                  borderColor: syncChip.border,
                  backgroundColor: syncChip.bg,
                  color: syncChip.color,
                }}
              >
                <Apple className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {syncChip.label}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:max-w-sm">
            <button
              type="button"
              onClick={mintToken}
              disabled={minting}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl px-4 text-[13px] font-semibold transition active:scale-[0.99] disabled:opacity-60"
              style={{ backgroundColor: theme.text, color: theme.bg }}
            >
              {minting ? "Generando enlace seguro…" : "Preparar token para el Atajo"}
            </button>
            <a
              href={runShortcutHref}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-semibold no-underline transition active:scale-[0.99]"
              style={{
                borderColor: saludHexToRgba(theme.accent.health, 0.45),
                backgroundColor: saludHexToRgba(theme.accent.health, 0.12),
                color: theme.accent.health,
              }}
            >
              <Zap className="h-4 w-4 shrink-0" aria-hidden />
              Traer datos de hoy desde Apple Health
            </a>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border px-4 text-[12px] font-semibold transition"
              style={{
                borderColor: theme.border,
                backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.7),
                color: theme.textMuted,
              }}
            >
              Actualizar lectura
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              Token una vez por sesión. Luego: “Traer datos de hoy”.
            </p>
          </div>
        </div>

        {toast ? (
          <p
            className="relative rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: theme.border,
              backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.9),
              color: theme.text,
            }}
          >
            {toast}
          </p>
        ) : null}

        {token ? (
          <div
            className="relative space-y-2 rounded-2xl border p-4"
            style={{
              borderColor: theme.border,
              backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.95),
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                Token (no lo compartas)
              </p>
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  borderColor: theme.border,
                  backgroundColor: saludHexToRgba(theme.surface, 0.9),
                  color: theme.text,
                }}
              >
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                Copiar
              </button>
            </div>
            <p className="break-all font-mono text-[13px] leading-relaxed" style={{ color: theme.accent.health }}>
              {token}
            </p>
            {tokenUntil ? (
              <p className="text-[11px]" style={{ color: theme.textMuted }}>
                Válido hasta {formatWhen(tokenUntil)}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Sueño",
              value: latest?.sleep_hours != null ? Math.round(latest.sleep_hours * 10) / 10 : null,
              unit: "h",
              hint: "Ideal 7-9 h",
              icon: MoonStar,
            },
            {
              label: "HRV",
              value: latest?.hrv_ms ?? null,
              unit: "ms",
              hint: "Tu margen de recuperación",
              icon: Activity,
            },
            {
              label: "Recuperación (proxy)",
              value: latest?.readiness_score ?? null,
              unit: "",
              hint: "Estado diario",
              icon: Sparkles,
            },
            {
              label: "Pasos",
              value: latest?.steps ?? null,
              unit: "",
              hint: "Objetivo base 7k",
              icon: Zap,
            },
          ].map((card) => {
            const Icon = card.icon
            const status =
              card.label === "Sueño"
                ? card.value == null
                  ? "Sin dato"
                  : card.value >= 7
                    ? "En rango"
                    : "Bajo"
                : card.label === "HRV"
                  ? card.value == null
                    ? "Sin dato"
                    : card.value >= 35
                      ? "Bien"
                      : "Bajo"
                  : card.label === "Recuperación (proxy)"
                    ? card.value == null
                      ? "Sin dato"
                      : card.value >= 65
                        ? "Listo"
                        : card.value >= 45
                          ? "Neutro"
                          : "Cuidar"
                    : card.value == null
                      ? "Sin dato"
                      : card.value >= 7000
                        ? "Meta"
                        : "Subir"
            const statusColor =
              status === "En rango" || status === "Bien" || status === "Listo" || status === "Meta"
                ? theme.accent.health
                : status === "Neutro" || status === "Subir"
                  ? theme.accent.agenda
                  : theme.textMuted
            return (
              <div
                key={card.label}
                className="rounded-[22px] border p-5 shadow-inner"
                style={{
                  borderColor: theme.border,
                  backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.75),
                  boxShadow: `inset 0 1px 0 ${saludHexToRgba(theme.border, 0.35)}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    {card.label}
                  </p>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      borderColor: saludHexToRgba(statusColor, 0.4),
                      backgroundColor: saludHexToRgba(statusColor, 0.12),
                      color: statusColor,
                    }}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {loading ? "…" : card.value == null ? "—" : card.value.toLocaleString("es-LA")}
                  {card.unit ? <span className="ml-1 text-sm font-medium">{card.unit}</span> : null}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed" style={{ color: theme.textMuted }}>
                  {card.hint}
                </p>
                <Icon className="mt-2 h-4 w-4 shrink-0" style={{ color: theme.textMuted }} aria-hidden />
              </div>
            )
          })}
        </div>

        <div
          className="relative rounded-[22px] border p-6"
          style={{
            borderColor: theme.border,
            background: `linear-gradient(135deg, ${saludHexToRgba(theme.surfaceAlt, 0.95)} 0%, ${saludHexToRgba(theme.surface, 0.85)} 100%)`,
          }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: theme.text }}>
            {recoveryNarrative(latest?.readiness_score, weekAvg)}
          </p>
          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: theme.textMuted }}>
            Check-in: {salud.scoreSalud}/100. Si Apple sube y tú te sientes bajo, prioriza descanso y baja carga.
          </p>
        </div>
      </div>
    </motion.section>
  )
}
