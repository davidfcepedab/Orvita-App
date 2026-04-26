"use client"

import { useCallback, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { BedDouble, ChevronUp, ClipboardCopy, Dumbbell, KeyRound, Lightbulb, MoonStar, Sparkles, Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { buildOrvitaRunShortcutHref } from "@/lib/shortcuts/orvitaHealthShortcut"
import {
  appleHealthSyncStale,
  buildAppleHealthSyncChip,
  formatAppleHealthSyncWhen,
} from "@/lib/salud/appleHealthSyncToolbar"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  loading: boolean
  onRefresh: () => Promise<void>
}

function estadoChipColors(label: string): { fg: string; bg: string } {
  switch (label) {
    case "Listo":
      return { fg: SALUD_SEM.ok, bg: saludHexToRgba(SALUD_SEM.ok, 0.14) }
    case "Recuperar":
      return { fg: SALUD_SEM.recovery, bg: saludHexToRgba(SALUD_SEM.recovery, 0.14) }
    case "Moderar":
      return { fg: SALUD_SEM.warn, bg: saludHexToRgba(SALUD_SEM.warn, 0.14) }
    case "Info":
      return { fg: SALUD_SEM.neutral, bg: saludHexToRgba(SALUD_SEM.neutral, 0.12) }
    default:
      return { fg: SALUD_SEM.warn, bg: saludHexToRgba(SALUD_SEM.warn, 0.12) }
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
  const [appleOpen, setAppleOpen] = useState(false)
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const panel = useMemo(() => saludPanelStyle(theme, 0.9), [theme])
  const weekAvg = useMemo(() => {
    const r = salud.trendAverage || salud.scoreSalud
    return typeof r === "number" && r > 0 ? r : salud.scoreSalud || 60
  }, [salud.scoreSalud, salud.trendAverage])

  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const staleSync = appleHealthSyncStale(latest?.observed_at)
  const syncChip = useMemo(() => buildAppleHealthSyncChip(latest), [latest])

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

  const dayState = useMemo(() => {
    const readiness = latest?.readiness_score
    const checkin = salud.scoreSalud
    const systemScore = Math.max(0, Math.min(100, Math.round(((readiness ?? checkin) + checkin) / 2)))
    if (readiness == null) {
      return {
        label: "Info",
        title: "Falta lectura Apple para cerrar estado del día",
        score: systemScore,
        color: theme.accent.agenda,
        bg: "transparent",
        insight: `Tu check-in marca ${checkin}/100. Usa “Traer datos de hoy” para completar la recomendación automática.`,
        actions: ["Ejecuta Atajo y refresca lectura", "Mantén carga moderada hasta validar Apple"],
      }
    }
    const divergence = Math.round(readiness - checkin)
    if (!staleSync && readiness >= 68 && checkin >= 60 && Math.abs(divergence) <= 12) {
      return {
        label: "Listo",
        title: "Tu sistema está listo para una carga útil",
        score: systemScore,
        color: theme.accent.health,
        bg: "transparent",
        insight: "Apple y check-in están alineados: energía y recuperación permiten avanzar.",
        actions: ["Mantén sesión planificada", "Protege hidratación y cierre de sueño"],
      }
    }
    if (readiness < 50 || checkin < 45 || divergence <= -18) {
      return {
        label: "Recuperar",
        title: "Hoy conviene priorizar recuperación",
        score: systemScore,
        color: theme.accent.finance,
        bg: "transparent",
        insight: `Divergencia relevante (Apple ${readiness}/100 vs check-in ${checkin}/100): evita sobrecarga.`,
        actions: ["Reduce intensidad y volumen", "Prioriza descanso + movilidad"],
      }
    }
    return {
      label: "Moderar",
      title: "Estado intermedio: avanza con control",
      score: systemScore,
      color: theme.accent.agenda,
      bg: "transparent",
      insight: `Apple ${readiness}/100 y check-in ${checkin}/100: hay margen, pero sin excederte.`,
      actions: ["Entrena en zona técnica", "Evalúa sensación al terminar"],
    }
  }, [latest?.readiness_score, salud.scoreSalud, staleSync, theme])

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

  const chipSem = estadoChipColors(dayState.label)

  return (
    <motion.section
      role="region"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{ ...panel, boxShadow: "none" }}
      aria-label="Apple Health"
    >
      {!appleOpen ? (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
          style={{ color: theme.text }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
            Apple Health
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={runShortcutHref}
              aria-label="Traer datos de hoy (Apple)"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white no-underline transition active:scale-[0.98]"
              style={{ backgroundColor: SALUD_SEM.energy }}
            >
              <Zap className="h-5 w-5 shrink-0" aria-hidden />
            </a>
            <button
              type="button"
              aria-label="Abrir panel de token y sincronización"
              aria-expanded={false}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-[0.98]"
              style={{
                borderColor: saludHexToRgba(theme.border, 0.85),
                backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.5),
                color: theme.text,
              }}
              onClick={() => setAppleOpen(true)}
            >
              <KeyRound className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col gap-8 p-5 sm:p-7" style={{ color: theme.text }}>
          <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: theme.textMuted }}>
              Apple Health
            </p>
            <button
              type="button"
              aria-label="Cerrar panel Apple Health"
              aria-expanded
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold"
              style={{ border: `1px solid ${saludHexToRgba(theme.border, 0.75)}`, color: theme.textMuted }}
              onClick={() => setAppleOpen(false)}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
              Cerrar
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="max-w-3xl space-y-2">
              <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-4xl">
                Datos automáticos, con calma y precisión
              </h1>
              <p className="text-[15px] leading-relaxed sm:text-base" style={{ color: theme.textMuted }}>
                Apple no lista Órvita en “Apps”: es normal. Usa el Atajo y aquí verás lectura + acción.
              </p>
            </div>

            <div
              className="flex flex-wrap items-center gap-2 border-t pt-4 sm:gap-2"
              style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
              role="toolbar"
              aria-label="Acciones Apple Health"
            >
              <button
                type="button"
                onClick={mintToken}
                disabled={minting}
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-medium transition active:scale-[0.99] disabled:opacity-50"
                style={{
                  borderColor: saludHexToRgba(theme.border, 0.85),
                  backgroundColor: "transparent",
                  color: theme.text,
                }}
              >
                {minting ? "Token…" : "Token atajo"}
              </button>
              <a
                href={runShortcutHref}
                className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-semibold text-white no-underline transition active:scale-[0.99]"
                style={{ backgroundColor: SALUD_SEM.energy }}
              >
                <Zap className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                Traer hoy
              </a>
              <button
                type="button"
                onClick={() => void onRefresh()}
                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-medium transition active:scale-[0.99]"
                style={{
                  border: `1px solid ${saludHexToRgba(theme.border, 0.75)}`,
                  backgroundColor: "transparent",
                  color: theme.textMuted,
                }}
              >
                Actualizar
              </button>
              <span
                className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold leading-snug sm:max-w-[min(100%,22rem)]"
                style={{
                  backgroundColor: syncChip.bg,
                  color: syncChip.fg,
                }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
                {syncChip.label}
              </span>
            </div>
            <p className="text-[10px] leading-snug" style={{ color: theme.textMuted }}>
              Token una vez por sesión; luego “Traer hoy” sincroniza el día.
            </p>
          </div>

          {toast ? (
            <p
              className="border-l-[3px] py-2 pl-3 text-sm leading-snug"
              style={{
                borderLeftColor: SALUD_SEM.warn,
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
              <p className="break-all font-mono text-[13px] leading-relaxed" style={{ color: SALUD_SEM.ok }}>
                {token}
              </p>
              {tokenUntil ? (
                <p className="text-[11px]" style={{ color: theme.textMuted }}>
                  Válido hasta {formatAppleHealthSyncWhen(tokenUntil)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="relative border-t pt-6" style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Estado del día
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: theme.text }}>
                {dayState.title}
              </h2>
              <span className="text-lg font-light tabular-nums opacity-50" aria-hidden>
                ·
              </span>
              <span className="text-2xl font-extrabold tabular-nums sm:text-3xl" style={{ color: chipSem.fg }}>
                {dayState.score}
              </span>
              <span
                className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ backgroundColor: chipSem.bg, color: chipSem.fg }}
              >
                {dayState.label}
              </span>
            </div>
            <p className="m-0 mt-3 text-sm leading-relaxed sm:text-[15px]" style={{ color: theme.text }}>
              {dayState.insight}
            </p>
            <ol className="m-0 mt-4 list-none space-y-3 p-0">
              {dayState.actions.map((action, idx) => {
                const Icon = idx === 0 ? Dumbbell : BedDouble
                return (
                  <li key={action} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                      style={{
                        backgroundColor: chipSem.bg,
                        color: chipSem.fg,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <motion.span
                      className="mt-0.5 inline-flex shrink-0"
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.15 }}
                      aria-hidden
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.65} style={{ color: chipSem.fg }} />
                    </motion.span>
                    <p className="m-0 min-w-0 flex-1 text-[16px] font-semibold leading-snug sm:text-[17px]">{action}</p>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Recuperación",
                tint: SALUD_SEM.recovery,
                icon: MoonStar,
                rows: [
                  { k: "Sueño", v: latest?.sleep_hours != null ? `${Math.round(latest.sleep_hours * 10) / 10} h` : "Sin dato" },
                  { k: "HRV", v: latest?.hrv_ms != null ? `${latest.hrv_ms} ms` : "Sin dato" },
                ],
              },
              {
                label: "Energía",
                tint: SALUD_SEM.energy,
                icon: Zap,
                rows: [
                  { k: "Pasos", v: latest?.steps != null ? latest.steps.toLocaleString("es-LA") : "Sin dato" },
                  { k: "Actividad", v: latest?.readiness_score != null ? `${latest.readiness_score}/100` : "Sin dato" },
                ],
              },
              {
                label: "Estado general",
                tint: SALUD_SEM.neutral,
                icon: Sparkles,
                rows: [
                  { k: "Check-in", v: `${salud.scoreSalud}/100` },
                  { k: "Sync Apple", v: staleSync ? "Desactualizado" : latest?.observed_at ? "Al día" : "Pendiente" },
                ],
              },
            ].map((group) => {
              const Icon = group.icon
              return (
                <div
                  key={group.label}
                  className="rounded-2xl p-4 sm:p-5"
                  style={{
                    backgroundColor: saludHexToRgba(group.tint, 0.1),
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                      {group.label}
                    </p>
                    <motion.div
                      style={{ color: group.tint }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                      aria-hidden
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.65} />
                    </motion.div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {group.rows.map((row) => (
                      <div key={row.k} className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-medium sm:text-xs" style={{ color: theme.textMuted }}>
                          {row.k}
                        </span>
                        <span className="text-right text-xl font-bold tabular-nums sm:text-2xl" style={{ color: theme.text }}>
                          {row.v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="flex gap-3 border-t pt-6"
            style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}
          >
            <Lightbulb className="mt-0.5 h-6 w-6 shrink-0" style={{ color: SALUD_SEM.warn }} aria-hidden />
            <div className="min-w-0 space-y-2">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Sugerencia del sistema
              </p>
              <p className="m-0 text-sm leading-relaxed sm:text-[15px]" style={{ color: theme.text }}>
                {recoveryNarrative(latest?.readiness_score, weekAvg)}
              </p>
              <p className="m-0 text-xs leading-relaxed sm:text-sm" style={{ color: theme.textMuted }}>
                Check-in: {salud.scoreSalud}/100. Si Apple sube y tú te sientes bajo, prioriza descanso y baja carga.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  )
}
