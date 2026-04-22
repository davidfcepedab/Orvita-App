"use client"

import { useCallback, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Apple, ClipboardCopy, Download, MoonStar, Sparkles, Zap } from "lucide-react"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"

const SHORTCUT_NAME = "Órvita – Importar Salud Hoy"

type Props = {
  salud: SaludContextSnapshot
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

export default function AppleHealthLuxurySection({ salud }: Props) {
  const { latest, loading, refetch } = useHealthAutoMetrics()
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const weekAvg = useMemo(() => {
    const r = salud.trendAverage || salud.scoreSalud
    return typeof r === "number" && r > 0 ? r : salud.scoreSalud || 60
  }, [salud.scoreSalud, salud.trendAverage])

  const shortcutInstallHref = useMemo(() => {
    if (typeof window === "undefined") return "#"
    const fileUrl = `${window.location.origin}/shortcuts/Orvita-Importar-Salud-Hoy.shortcut`
    return `shortcuts://import-shortcut/?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(SHORTCUT_NAME)}`
  }, [])

  const runShortcutHref = useMemo(
    () => `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`,
    [],
  )

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

  const openInstall = useCallback(() => {
    window.location.href = shortcutInstallHref
  }, [shortcutInstallHref])

  const runShortcut = useCallback(() => {
    window.location.href = runShortcutHref
  }, [runShortcutHref])

  if (salud.loading) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-sm text-white/70 backdrop-blur-2xl">
        Estamos preparando tu panel de salud…
      </div>
    )
  }

  if (salud.error) {
    return (
      <div className="rounded-[32px] border border-red-400/30 bg-red-500/10 p-8 text-sm text-red-100 backdrop-blur-2xl">
        {salud.error}
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.06] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-10"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(125,211,252,0.18),transparent_55%),radial-gradient(90%_70%_at_100%_20%,rgba(167,243,208,0.14),transparent_50%)]" />

      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Apple Health</p>
            <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
              Datos automáticos, con calma y precisión
            </h1>
            <p className="text-[15px] leading-relaxed text-white/72 sm:text-base">
              Apple no muestra Órvita dentro de Salud → Apps en iPhone: es normal. Lo que sí puedes hacer es traer tu día
              con un Atajo profesional que lee HealthKit y lo envía a Órvita en un solo gesto.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <Apple className="h-3.5 w-3.5" aria-hidden />
                Fuente: Apple Health (HealthKit)
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Última sync: {formatWhen(latest?.observed_at)}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:max-w-sm">
            <button
              type="button"
              onClick={mintToken}
              disabled={minting}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-white px-5 text-[15px] font-semibold text-slate-900 shadow-lg transition active:scale-[0.99] disabled:opacity-60"
            >
              {minting ? "Generando enlace seguro…" : "Preparar token para el Atajo"}
            </button>
            <button
              type="button"
              onClick={openInstall}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 text-[15px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/10 active:scale-[0.99]"
            >
              <Download className="h-4 w-4" aria-hidden />
              Instalar Atajo (archivo .shortcut)
            </button>
            <button
              type="button"
              onClick={runShortcut}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/15 px-5 text-[15px] font-semibold text-emerald-50 transition hover:bg-emerald-400/25 active:scale-[0.99]"
            >
              <Zap className="h-4 w-4" aria-hidden />
              Traer datos de hoy desde Apple Health
            </button>
            <p className="text-[12px] leading-relaxed text-white/50">
              1) Instala el Atajo una vez. 2) Genera token aquí y cópialo. 3) Ejecuta el Atajo: pedirá el token y enviará
              sueño (análisis), entrenos del día, pasos, energía activa, HRV y FC en reposo.
            </p>
          </div>
        </div>

        {toast ? (
          <p className="relative rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
            {toast}
          </p>
        ) : null}

        {token ? (
          <div className="relative space-y-2 rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Token (no lo compartas)</p>
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                Copiar
              </button>
            </div>
            <p className="break-all font-mono text-[13px] leading-relaxed text-emerald-100/90">{token}</p>
            {tokenUntil ? (
              <p className="text-[11px] text-white/45">Válido hasta {formatWhen(tokenUntil)}</p>
            ) : null}
          </div>
        ) : null}

        <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Sueño",
              value: latest?.sleep_hours != null ? `${Math.round(latest.sleep_hours * 10) / 10} h` : "—",
              hint: "Desde Apple Health cuando lo importes",
              icon: MoonStar,
            },
            {
              label: "HRV",
              value: latest?.hrv_ms != null ? `${latest.hrv_ms} ms` : "—",
              hint: "Variabilidad del ritmo cardíaco",
              icon: Activity,
            },
            {
              label: "Recuperación (proxy)",
              value: latest?.readiness_score != null ? `${latest.readiness_score}` : "—",
              hint: "Modelo suave a partir de tus señales del día",
              icon: Sparkles,
            },
            {
              label: "Pasos",
              value: latest?.steps != null ? `${latest.steps.toLocaleString("es-LA")}` : "—",
              hint: "Suma del día importada",
              icon: Zap,
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className="rounded-[22px] border border-white/10 bg-black/25 p-5 shadow-inner shadow-black/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{card.label}</p>
                  <Icon className="h-4 w-4 text-white/35" aria-hidden />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{loading ? "…" : card.value}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/50">{card.hint}</p>
              </div>
            )
          })}
        </div>

        <div className="relative rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6">
          <p className="text-[13px] leading-relaxed text-white/78">{recoveryNarrative(latest?.readiness_score, weekAvg)}</p>
          <p className="mt-4 text-[13px] leading-relaxed text-white/60">
            Tu check-in de salud hoy está en {salud.scoreSalud}: lo usamos como brújula emocional y de hábitos, no como
            reemplazo clínico. Si tus pasos de Apple suben pero tu energía interna baja, suele ser señal de acumulación
            de estrés o sueño irregular.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            Actualizar lectura
          </button>
        </div>
      </div>
    </motion.section>
  )
}
