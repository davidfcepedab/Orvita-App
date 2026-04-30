"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Building2,
  Calendar,
  Check,
  Clock,
  Cloud,
  Droplets,
  Dumbbell,
  Heart,
  Moon,
  PenLine,
  Ruler,
  Save,
  Smile,
  Sparkles,
  Sun,
  Sunrise,
  Target,
} from "lucide-react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import {
  CHECKIN_SUPABASE_DISABLED_MESSAGE,
  getAppMode,
  isAppMockMode,
  isSupabaseEnabled,
  UI_CHECKIN_BANNER_MOCK,
  UI_CHECKIN_BANNER_NO_CLOUD,
  UI_CHECKIN_SAVE_DISABLED_FOOTER,
} from "@/lib/checkins/flags"
import {
  NumberUnitField,
  SelectField,
  SliderRow,
  TextareaRow,
  TimeField,
  ToggleRow,
} from "./CheckinFields"
import { CheckinSection } from "./CheckinSection"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { addDaysIso } from "@/lib/habits/habitMetrics"
import { buildOfflineSnapshotFromCheckinForm, saveOfflineCheckinSnapshot } from "@/lib/pwa/offlineSnapshot"
import { markPushValueDeliveredForPrompt } from "@/lib/notifications/pushClient"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"

async function buildJsonHeaders(): Promise<HeadersInit> {
  const base: HeadersInit = { "Content-Type": "application/json" }
  if (isAppMockMode()) return base
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return base
  return { ...base, Authorization: `Bearer ${token}` }
}

type CheckinApiFlags = {
  appMode?: string
  supabasePersistenceEnabled?: boolean
}

type FormState = {
  fecha: string
  hoy: boolean
  ayer: boolean
  horaDespertar: string
  horaDormir: string
  agua: string
  meditacion: string
  lectura: string
  dietaCumplida: number
  avanceProyecto: number
  tiempoPareja: number
  interaccionSocial: number
  calidadSueno: number
  descanso: number
  energia: number
  ansiedad: number
  estadoAnimo: number
  calidadConexion: number
  entreno: boolean
  tipoEntreno: string
  minutosEntreno: string | number
  peso: string
  pct_grasa: string
  cintura: string
  pecho: string
  hombros: string
  bicepsDer: string
  bicepsIzq: string
  cuadricepsDer: string
  cuadricepsIzq: string
  gluteos: string
  deepWork: string
  productividad: number
  sheet_row_id: string
  source: "" | "sheets" | "manual"
  journalMomento: string
  journalGratitud: string
  journalVinculo: string
}

const TRAINING_TYPES = [
  "Gimnasio",
  "Push Volumen",
  "Upper Pesado",
  "Upper Metabolico",
  "Pull Espalda Dominante",
  "Deltoide Especializacion",
  "Lower Mantenimiento",
  "Natacion",
  "Dia de descanso",
] as const

type CheckinViewport = "manana" | "dia" | "noche" | "full"

function hashToViewport(raw: string): CheckinViewport {
  if (raw === "checkin-manana") return "manana"
  if (raw === "checkin-dia") return "dia"
  if (raw === "checkin-noche") return "noche"
  return "full"
}

function viewportToHash(vp: CheckinViewport): string {
  if (vp === "manana") return "checkin-manana"
  if (vp === "dia") return "checkin-dia"
  if (vp === "noche") return "checkin-noche"
  return ""
}

const VIEWPORT_TABS: { id: CheckinViewport; label: string; hint: string }[] = [
  { id: "manana", label: "Mañana", hint: "Sueño y energía" },
  { id: "dia", label: "Día", hint: "Foco, cuerpo y vínculos" },
  { id: "noche", label: "Noche", hint: "Cierre y medidas" },
  { id: "full", label: "Completo", hint: "Todo el formulario" },
]

const SLIDER_MIN = 1
const SLIDER_MAX = 10

function inSliderRange(n: number): boolean {
  return Number.isFinite(n) && n >= SLIDER_MIN && n <= SLIDER_MAX
}

/** Validación por vista: puedes guardar por bloques sin rellenar el resto primero (el estado del formulario completo se envía igual). */
function checkinSaveValidationError(viewport: CheckinViewport, form: FormState): string | null {
  if (!form.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha.trim())) {
    return "Indica una fecha válida (YYYY-MM-DD)."
  }
  if (viewport === "manana") {
    if (!inSliderRange(form.calidadSueno)) return "Ajusta la calidad del sueño (1–10)."
    if (!inSliderRange(form.energia)) return "Ajusta el nivel de energía (1–10)."
    return null
  }
  if (viewport === "noche") {
    if (!inSliderRange(form.estadoAnimo)) return "Ajusta el estado de ánimo (1–10)."
    if (!inSliderRange(form.descanso)) return "Ajusta el descanso percibido (1–10)."
    if (!inSliderRange(form.ansiedad)) return "Ajusta el nivel de ansiedad (1–10)."
    return null
  }
  if (viewport === "dia") {
    return null
  }
  if (!inSliderRange(form.calidadSueno)) return "Revisa Mañana: calidad del sueño (1–10)."
  if (!inSliderRange(form.energia)) return "Revisa Mañana: nivel de energía (1–10)."
  if (!inSliderRange(form.estadoAnimo)) return "Revisa Noche: estado de ánimo (1–10)."
  return null
}

function saveCtaLabel(viewport: CheckinViewport): string {
  if (viewport === "full") return "Guardar check-in completo"
  if (viewport === "manana") return "Guardar · mañana"
  if (viewport === "dia") return "Guardar · día"
  return "Guardar · noche"
}

export default function CheckinPage() {
  /** Día civil en la zona de agenda (no UTC), para no adelantar “mañana” por la noche. */
  const today = agendaTodayYmd()
  const yesterday = addDaysIso(today, -1)

  const [form, setForm] = useState<FormState>({
    fecha: today,
    hoy: true,
    ayer: false,

    horaDespertar: "",
    horaDormir: "",
    agua: "",
    meditacion: "",
    lectura: "",

    dietaCumplida: 0,
    avanceProyecto: 0,
    tiempoPareja: 0,
    interaccionSocial: 0,

    calidadSueno: 5,
    descanso: 5,
    energia: 5,
    ansiedad: 5,
    estadoAnimo: 5,
    calidadConexion: 5,

    entreno: false,
    tipoEntreno: "",
    minutosEntreno: "",

    peso: "",
    pct_grasa: "",
    cintura: "",
    pecho: "",
    hombros: "",
    bicepsDer: "",
    bicepsIzq: "",
    cuadricepsDer: "",
    cuadricepsIzq: "",
    gluteos: "",

    deepWork: "",
    productividad: 5,

    sheet_row_id: "",
    source: "",

    journalMomento: "",
    journalGratitud: "",
    journalVinculo: "",
  })

  const [savePhase, setSavePhase] = useState<"idle" | "loading" | "success">("idle")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [preloadStatus, setPreloadStatus] = useState<string | null>(null)
  const [apiNotice, setApiNotice] = useState<string | null>(null)
  const [apiFlags, setApiFlags] = useState<CheckinApiFlags | null>(null)
  const [viewport, setViewport] = useState<CheckinViewport>("full")
  const { latest: appleHealthSnap, loading: appleHealthLoading } = useHealthAutoMetrics()

  const supabaseOnFromEnv = isSupabaseEnabled()
  const mockOnFromEnv = isAppMockMode()
  const supabaseOn = apiFlags?.supabasePersistenceEnabled ?? supabaseOnFromEnv
  const mockOn = apiFlags?.appMode === "mock" || mockOnFromEnv
  const saveDisabled = !supabaseOn && !mockOn

  /** Medidas corporales ya traídas desde la hoja enlazada: no editar aquí para no duplicar ni pisar datos. */
  const bodyMeasuresLocked = useMemo(() => {
    return form.source === "sheets" && Boolean(String(form.sheet_row_id ?? "").trim())
  }, [form.source, form.sheet_row_id])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setApiNotice(null)
        const headers = await buildJsonHeaders()
        const res = await fetch("/api/checkin/preload", { cache: "no-store", headers })
        const json = (await res.json()) as {
          success?: boolean
          source?: string
          data?: Record<string, unknown>
          message?: string
          error?: string
          notice?: string
          flags?: CheckinApiFlags
        }
        if (cancelled) return
        if (!res.ok || !json.success) {
          setPreloadStatus(messageForHttpError(res.status, json.error, res.statusText))
          if (json.flags) setApiFlags(json.flags)
          return
        }
        if (json.flags) setApiFlags(json.flags)
        if (json.message) {
          setPreloadStatus(json.message)
        } else {
          setPreloadStatus(null)
        }
        const notice = typeof json.notice === "string" ? json.notice : null
        setApiNotice(notice)
        const patch = json.data || {}
        if (Object.keys(patch).length === 0) return

        setForm((prev) => {
          const next = { ...prev }
          const str = (v: unknown) => (v === undefined || v === null ? "" : String(v))
          const num = (v: unknown, fallback: number) => {
            const n = typeof v === "number" ? v : Number(v)
            return Number.isFinite(n) ? n : fallback
          }

          if (typeof patch.fecha === "string" && patch.fecha) {
            next.fecha = patch.fecha
            next.hoy = patch.fecha === today
            next.ayer = patch.fecha !== today ? prev.ayer : false
          }
          if (patch.energia !== undefined) next.energia = num(patch.energia, prev.energia)
          if (patch.estadoAnimo !== undefined) next.estadoAnimo = num(patch.estadoAnimo, prev.estadoAnimo)
          if (patch.productividad !== undefined) next.productividad = num(patch.productividad, prev.productividad)
          if (patch.peso !== undefined) next.peso = str(patch.peso)
          if (patch.pct_grasa !== undefined) next.pct_grasa = str(patch.pct_grasa)
          if (patch.cintura !== undefined) next.cintura = str(patch.cintura)
          if (patch.pecho !== undefined) next.pecho = str(patch.pecho)
          if (patch.hombros !== undefined) next.hombros = str(patch.hombros)
          if (patch.bicepsDer !== undefined) next.bicepsDer = str(patch.bicepsDer)
          if (patch.bicepsIzq !== undefined) next.bicepsIzq = str(patch.bicepsIzq)
          if (patch.cuadricepsDer !== undefined) next.cuadricepsDer = str(patch.cuadricepsDer)
          if (patch.cuadricepsIzq !== undefined) next.cuadricepsIzq = str(patch.cuadricepsIzq)
          if (patch.gluteos !== undefined) next.gluteos = str(patch.gluteos)
          if (typeof patch.sheet_row_id === "string" && patch.sheet_row_id) {
            next.sheet_row_id = patch.sheet_row_id
          }
          if (patch.source === "sheets" || patch.source === "manual") {
            next.source = patch.source
          }
          if (typeof patch.journalMomento === "string") next.journalMomento = patch.journalMomento
          if (typeof patch.journalGratitud === "string") next.journalGratitud = patch.journalGratitud
          if (typeof patch.journalVinculo === "string") next.journalVinculo = patch.journalVinculo
          return next
        })
      } catch {
        if (!cancelled) setPreloadStatus("Error de red al precargar.")
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [today])

  const setViewportAndUrl = useCallback((vp: CheckinViewport) => {
    setSubmitError(null)
    setViewport(vp)
    if (typeof window === "undefined") return
    const hash = viewportToHash(vp)
    const path = window.location.pathname + window.location.search
    const next = hash ? `${path}#${hash}` : path
    window.history.replaceState(null, "", next)
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const raw = window.location.hash.replace(/^#/, "")
      const vp = hashToViewport(raw)
      setViewport(vp)
      if (vp !== "full" || !raw) return
      requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current)
    }
  }, [])

  const handleChange = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    if (saveDisabled) {
      setSubmitError(CHECKIN_SUPABASE_DISABLED_MESSAGE)
      return
    }
    const validationError = checkinSaveValidationError(viewport, form)
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    setSavePhase("loading")
    try {
      const headers = await buildJsonHeaders()
      const payload = {
        ...form,
        source: form.source || (form.sheet_row_id ? "sheets" : "manual"),
        save_viewport: viewport,
      }
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as {
        success?: boolean
        error?: string
        hint?: string
        mock?: boolean
        code?: string
        flags?: CheckinApiFlags
      }
      if (!res.ok || !json.success) {
        if (json.flags) setApiFlags(json.flags)
        const base = messageForHttpError(res.status, json.error, res.statusText)
        setSubmitError(json.hint ? `${base} · ${json.hint}` : base)
        setSavePhase("idle")
        return
      }
      if (json.flags) setApiFlags(json.flags)
      saveOfflineCheckinSnapshot(buildOfflineSnapshotFromCheckinForm(form))
      markPushValueDeliveredForPrompt()
      setSavePhase("success")
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current)
      saveSuccessTimerRef.current = setTimeout(() => {
        setSavePhase("idle")
        saveSuccessTimerRef.current = null
      }, 2800)
    } catch {
      setSubmitError("Error de red al guardar. Revisa la conexión e inténtalo de nuevo.")
      setSavePhase("idle")
    }
  }

  const chipDay =
    "inline-flex min-h-[34px] items-center justify-center rounded-md border px-3 text-[11px] font-medium transition active:scale-[0.99] sm:min-h-[32px]"

  const topStatus = useMemo(() => {
    if (mockOn) return { tone: "agenda" as const, text: UI_CHECKIN_BANNER_MOCK, title: UI_CHECKIN_BANNER_MOCK }
    if (!supabaseOn)
      return { tone: "danger" as const, text: UI_CHECKIN_BANNER_NO_CLOUD, title: UI_CHECKIN_BANNER_NO_CLOUD }
    if (preloadStatus) return { tone: "warn" as const, text: preloadStatus, title: preloadStatus }
    if (apiNotice) return { tone: "neutral" as const, text: apiNotice, title: apiNotice }
    return null
  }, [mockOn, supabaseOn, preloadStatus, apiNotice])

  const topStatusClass =
    topStatus?.tone === "danger"
      ? "text-[var(--color-accent-danger)]"
      : topStatus?.tone === "warn"
        ? "text-orbita-primary"
        : topStatus?.tone === "agenda"
          ? "text-orbita-primary"
          : "text-orbita-secondary"

  return (
    <div className="relative mx-auto max-w-2xl space-y-3 px-2 pb-28 pt-1 sm:space-y-4 sm:px-0 sm:pb-32">
      <div className="flex flex-col gap-2 border-b border-orbita-border/55 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {topStatus ? (
          <p
            role={mockOn || topStatus.tone === "danger" ? "alert" : "status"}
            title={topStatus.title}
            className={`m-0 min-w-0 flex-1 text-[11px] leading-snug sm:text-xs ${topStatusClass}`}
          >
            <span className="line-clamp-2 [overflow-wrap:anywhere] sm:line-clamp-1">{topStatus.text}</span>
          </p>
        ) : (
          <p className="m-0 min-w-0 flex-1 text-[11px] text-orbita-secondary sm:text-xs">Listo para guardar en la fecha elegida.</p>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-1.5">
          <Link
            href="/hoy"
            className="inline-flex h-8 items-center rounded-md border border-transparent px-2 text-[11px] font-medium text-orbita-secondary underline decoration-orbita-border underline-offset-4 transition hover:text-orbita-primary"
          >
            ← Hoy
          </Link>
          {supabaseOn ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-health)] sm:hidden"
              title="Guardado en nube activo"
              aria-hidden
            />
          ) : null}
          <span
            className={`hidden h-7 items-center rounded-md border px-2 text-[10px] font-medium tabular-nums sm:inline-flex ${
              supabaseOn
                ? "border-orbita-border/80 bg-orbita-surface-alt/60 text-orbita-secondary"
                : "border-orbita-border text-orbita-secondary opacity-80"
            }`}
            title={`App: ${mockOn ? "mock" : getAppMode()} · Supabase: ${supabaseOn ? "activo" : "inactivo"}`}
          >
            {supabaseOn ? "Nube activa" : "Sin nube"}
          </span>
        </div>
      </div>

      {!mockOn && supabaseOn && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 rounded-lg border border-orbita-border/60 bg-orbita-surface-alt/25 px-2.5 py-2 text-[11px] leading-snug text-orbita-secondary">
          <span className="font-medium text-orbita-primary">Salud</span>
          {appleHealthLoading ? (
            <span>Cargando…</span>
          ) : appleHealthSnap ? (
            <span className="min-w-0 text-right [overflow-wrap:anywhere]">
              {appleHealthSnap.observed_at?.slice(0, 10) ?? "—"} ·{" "}
              {appleHealthSnap.steps != null ? appleHealthSnap.steps.toLocaleString("es-ES") : "—"} pasos ·{" "}
              <Link href="/health" className="font-medium text-[var(--color-accent-health)] underline-offset-2 hover:underline">
                Salud
              </Link>
            </span>
          ) : (
            <span className="min-w-0 text-right">
              Sin atajo aún ·{" "}
              <Link href="/health" className="font-medium text-[var(--color-accent-health)] underline-offset-2 hover:underline">
                Configurar
              </Link>
            </span>
          )}
        </div>
      )}

      <header className="flex flex-col gap-3 rounded-xl border border-orbita-border/80 bg-orbita-surface p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orbita-surface-alt text-[var(--color-accent-agenda)]">
            <Calendar className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-orbita-primary sm:text-xl">Check-in diario</h1>
            <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary sm:text-xs">
              Misma fecha en todas las vistas; puedes guardar por partes o todo junto.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={`${chipDay} ${
                  form.hoy
                    ? "border-[color-mix(in_srgb,var(--color-accent-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,var(--color-surface))] text-orbita-primary"
                    : "border-orbita-border/80 bg-transparent text-orbita-secondary hover:bg-orbita-surface-alt/50"
                }`}
                onClick={() => {
                  handleChange("fecha", today)
                  handleChange("hoy", true)
                  handleChange("ayer", false)
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`${chipDay} ${
                  form.ayer
                    ? "border-[color-mix(in_srgb,var(--color-accent-primary)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,var(--color-surface))] text-orbita-primary"
                    : "border-orbita-border/80 bg-transparent text-orbita-secondary hover:bg-orbita-surface-alt/50"
                }`}
                onClick={() => {
                  handleChange("fecha", yesterday)
                  handleChange("ayer", true)
                  handleChange("hoy", false)
                }}
              >
                Ayer
              </button>
            </div>
          </div>
        </div>
        <label className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:max-w-[11rem]">
          <span className="text-[10px] font-medium uppercase tracking-wide text-orbita-secondary">Fecha</span>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => {
              handleChange("fecha", e.target.value)
              handleChange("hoy", e.target.value === today)
              handleChange("ayer", false)
            }}
            className="h-9 w-full rounded-md border border-orbita-border bg-orbita-surface px-2 text-xs text-orbita-primary outline-none transition focus:border-[color-mix(in_srgb,var(--color-accent-primary)_38%,var(--color-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-accent-primary)_22%,transparent)] sm:min-w-[9.5rem]"
            aria-label="Fecha del check-in"
          />
        </label>
      </header>

      <nav
        aria-label="Parte del formulario a mostrar"
        className="overflow-hidden rounded-lg border border-orbita-border/70 bg-orbita-surface"
      >
        <div className="grid grid-cols-2 gap-px border-b border-orbita-border/50 bg-orbita-border/40 p-px sm:grid-cols-4">
          {VIEWPORT_TABS.map((tab) => {
            const active = viewport === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewportAndUrl(tab.id)}
                className={`flex min-h-[40px] flex-col items-center justify-center gap-0 bg-orbita-surface px-1 py-1.5 text-center transition sm:min-h-[42px] sm:px-1.5 ${
                  active
                    ? "bg-orbita-surface-alt font-medium text-orbita-primary ring-1 ring-inset ring-orbita-border/70"
                    : "text-orbita-secondary hover:bg-orbita-surface-alt/70"
                }`}
              >
                <span className="text-[10px] font-semibold tracking-tight sm:text-[11px]">{tab.label}</span>
                <span className={`hidden text-[9px] leading-tight sm:line-clamp-1 sm:block ${active ? "text-orbita-primary/80" : ""}`}>
                  {tab.hint}
                </span>
              </button>
            )
          })}
        </div>
        {viewport !== "full" ? (
          <p className="m-0 px-2.5 py-2 text-center text-[10px] leading-snug text-orbita-secondary sm:px-3 sm:text-[11px]">
            Mismo formulario: cada guardado actualiza el registro de esta fecha.
          </p>
        ) : null}
        <details className="border-t border-orbita-border/50 text-[10px] text-orbita-secondary open:bg-orbita-surface-alt/25">
          <summary className="cursor-pointer list-none px-2.5 py-2 text-orbita-primary marker:content-none sm:px-3 [&::-webkit-details-marker]:hidden">
            <span className="text-orbita-secondary">Historial del día</span>
            <span className="ml-1 text-orbita-primary/70">· detalle</span>
          </summary>
          <p className="m-0 border-t border-orbita-border/35 px-2.5 pb-2.5 pt-2 leading-snug sm:px-3">
            Varios guardados el mismo día se unen en un solo registro (último gana). Contexto y salud usan ese registro.
          </p>
        </details>
      </nav>

      <div className="space-y-4 sm:space-y-5">
        {(viewport === "full" || viewport === "manana") && (
        <div
          id="checkin-manana"
          className="scroll-mt-28 space-y-4 sm:scroll-mt-32 sm:space-y-5"
        >
        <CheckinSection
          title="Despertar & Energía Matinal"
          subtitle="Sueño, descanso percibido y energía al levantarte"
          icon={Sunrise}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-warning)_14%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-background))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-warning)_22%,var(--color-surface-alt))] text-[var(--color-accent-warning)]"
        >
          <TimeField label="Hora despertar" icon={Clock} value={form.horaDespertar} onChange={(v) => handleChange("horaDespertar", v)} />
          <SliderRow
            label="Calidad del sueño"
            value={form.calidadSueno}
            onChange={(n) => handleChange("calidadSueno", n)}
            accentClass="accent-[var(--color-accent-warning)]"
          />
          <SliderRow
            label="Nivel de energía"
            value={form.energia}
            onChange={(n) => handleChange("energia", n)}
            accentClass="accent-[var(--color-accent-agenda)]"
          />
        </CheckinSection>
        </div>
        )}

        {(viewport === "full" || viewport === "dia") && (
        <div
          id="checkin-dia"
          className="scroll-mt-28 space-y-4 sm:scroll-mt-32 sm:space-y-5"
        >
        <CheckinSection
          title="Actividades & Bienestar Diurno"
          subtitle="Hábitos, hidratación y foco profundo"
          icon={Sun}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-background))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-health)_20%,var(--color-surface-alt))] text-[var(--color-accent-health)]"
        >
          <ToggleRow
            label="Dieta cumplida"
            checked={form.dietaCumplida === 1}
            onChange={(v) => handleChange("dietaCumplida", v ? 1 : 0)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField
              label="Agua"
              icon={Droplets}
              value={form.agua}
              onChange={(v) => handleChange("agua", v)}
              unit="L"
              placeholder="0"
              step="0.1"
            />
            <NumberUnitField
              label="Meditación"
              value={form.meditacion}
              onChange={(v) => handleChange("meditacion", v)}
              unit="min"
              placeholder="0"
            />
            <NumberUnitField
              label="Lectura"
              icon={BookOpen}
              value={form.lectura}
              onChange={(v) => handleChange("lectura", v)}
              unit="pág"
              placeholder="0"
            />
            <NumberUnitField
              label="Deep Work"
              icon={Target}
              value={form.deepWork}
              onChange={(v) => handleChange("deepWork", v)}
              unit="hrs"
              placeholder="0"
              step="0.25"
            />
          </div>
          <ToggleRow
            label="Avance proyecto"
            icon={Building2}
            checked={form.avanceProyecto === 1}
            onChange={(v) => handleChange("avanceProyecto", v ? 1 : 0)}
          />
          <SliderRow
            label="Productividad"
            value={form.productividad}
            onChange={(n) => handleChange("productividad", n)}
            accentClass="accent-[var(--color-accent-warning)]"
          />
        </CheckinSection>

        <CheckinSection
          title="Entrenamiento & Fitness"
          subtitle="Sesión del día"
          icon={Dumbbell}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-accent-primary)_10%,var(--color-background))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-health)_22%,var(--color-surface-alt))] text-[var(--color-accent-health)]"
        >
          <ToggleRow
            label="Entrenamiento realizado"
            icon={Dumbbell}
            checked={form.entreno}
            onChange={(v) => handleChange("entreno", v)}
          />
          {form.entreno && (
            <>
              <SelectField
                label="Tipo de entrenamiento"
                value={form.tipoEntreno}
                onChange={(v) => {
                  handleChange("tipoEntreno", v)
                  if (v === "Dia de descanso") handleChange("minutosEntreno", "0")
                }}
              >
                <option value="">Seleccionar</option>
                {TRAINING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectField>
              <NumberUnitField
                label="Duración"
                icon={Clock}
                value={String(form.minutosEntreno)}
                onChange={(v) => handleChange("minutosEntreno", v)}
                unit="min"
                placeholder="0"
                step="1"
                disabled={form.tipoEntreno === "Dia de descanso"}
              />
            </>
          )}
        </CheckinSection>

        <CheckinSection
          title="Conexiones & Relaciones"
          subtitle="Pareja, social y calidad de vínculo"
          icon={Heart}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-agenda)_12%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-accent-finance)_8%,var(--color-background))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-agenda)_22%,var(--color-surface-alt))] text-[var(--color-accent-agenda)]"
        >
          <ToggleRow
            label="Tiempo pareja"
            icon={Heart}
            checked={form.tiempoPareja === 1}
            onChange={(v) => handleChange("tiempoPareja", v ? 1 : 0)}
          />
          <ToggleRow
            label="Interacción social"
            icon={Sparkles}
            checked={form.interaccionSocial === 1}
            onChange={(v) => handleChange("interaccionSocial", v ? 1 : 0)}
          />
          <SliderRow
            label="Calidad de conexión"
            icon={Heart}
            value={form.calidadConexion}
            onChange={(n) => handleChange("calidadConexion", n)}
            accentClass="accent-[var(--color-accent-agenda)]"
          />
        </CheckinSection>
        </div>
        )}

        {(viewport === "full" || viewport === "noche") && (
        <div
          id="checkin-noche"
          className="scroll-mt-28 space-y-4 sm:scroll-mt-32 sm:space-y-5"
        >
        <CheckinSection
          title="Balance Nocturno & Descanso"
          subtitle="Cierre del día y regulación emocional"
          icon={Moon}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-surface-alt)_92%,var(--color-background))] to-[color-mix(in_srgb,var(--color-accent-agenda)_10%,var(--color-surface))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-agenda)_22%,var(--color-surface-alt))] text-[var(--color-accent-agenda)]"
        >
          <TimeField label="Hora dormir" icon={Clock} value={form.horaDormir} onChange={(v) => handleChange("horaDormir", v)} />
          <SliderRow
            label="Descanso percibido (día)"
            value={form.descanso}
            onChange={(n) => handleChange("descanso", n)}
            accentClass="accent-[var(--color-text-secondary)]"
          />
          <SliderRow
            label="Estado de ánimo"
            icon={Smile}
            value={form.estadoAnimo}
            onChange={(n) => handleChange("estadoAnimo", n)}
            accentClass="accent-[var(--color-accent-agenda)]"
          />
          <SliderRow
            label="Nivel de ansiedad"
            icon={Cloud}
            value={form.ansiedad}
            onChange={(n) => handleChange("ansiedad", n)}
            accentClass="accent-[var(--color-accent-finance)]"
          />

          <div className="space-y-3 rounded-xl border border-orbita-border/80 bg-orbita-surface-alt/50 p-4">
            <div className="flex items-start gap-2">
              <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-agenda)]" aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-orbita-primary">Bitácora guiada</p>
                <p className="text-[11px] leading-snug text-orbita-secondary">
                  Tres respuestas cortas enlazan lo que marcaste arriba con tu día: descanso percibido, ánimo y vínculos. Se guardan con el check-in para ver patrones después.
                </p>
              </div>
            </div>
            <TextareaRow
              label="¿Qué momento del día te costó más soltar?"
              hint="Una frase basta. Relaciónalo con energía o conexión si quieres."
              icon={PenLine}
              value={form.journalMomento}
              onChange={(v) => handleChange("journalMomento", v)}
              placeholder="Ej.: La tarde, seguí pensando en el trabajo en la cena…"
              rows={2}
            />
            <TextareaRow
              label="Algo pequeño por lo que te sientes agradecido"
              hint="Gratitud concreta, no tiene que ser grande."
              icon={Sparkles}
              value={form.journalGratitud}
              onChange={(v) => handleChange("journalGratitud", v)}
              placeholder="Ej.: Caminar 10 minutos con mi pareja sin mirar el teléfono."
              rows={2}
            />
            <TextareaRow
              label="Cómo te sentiste con las personas importantes hoy"
              hint="Con la misma idea que “Calidad de conexión” del bloque de día."
              icon={Heart}
              value={form.journalVinculo}
              onChange={(v) => handleChange("journalVinculo", v)}
              placeholder="Ej.: Cercanía con un amigo; distancia con alguien del trabajo…"
              rows={2}
            />
          </div>
        </CheckinSection>

        <CheckinSection
          title="Medidas & Composición Corporal"
          subtitle="Opcional — empieza cerrado para no saturar; abre si quieres revisar o editar"
          icon={Ruler}
          headerTintClass="bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-warning)_12%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-accent-danger)_8%,var(--color-background))]"
          iconBoxClass="bg-[color-mix(in_srgb,var(--color-accent-warning)_22%,var(--color-surface-alt))] text-[var(--color-accent-warning)]"
          collapsible
          defaultCollapsed
        >
          {bodyMeasuresLocked ? (
            <div
              role="status"
              className="rounded-xl border border-[color-mix(in_srgb,var(--color-accent-agenda)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-agenda)_8%,var(--color-surface))] px-3 py-2.5 text-[11px] leading-snug text-orbita-primary"
            >
              Estos números ya vienen de tu hoja del día enlazada. Para cambiarlos, corrígelos en la hoja y vuelve a cargar el check-in; aquí los dejamos fijos para que no se mezclen versiones por error.
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField
              label="Peso"
              value={form.peso}
              onChange={(v) => handleChange("peso", v)}
              unit="kg"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="% grasa"
              value={form.pct_grasa}
              onChange={(v) => handleChange("pct_grasa", v)}
              unit="%"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="Cintura"
              value={form.cintura}
              onChange={(v) => handleChange("cintura", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="Pecho"
              value={form.pecho}
              onChange={(v) => handleChange("pecho", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="Hombros"
              value={form.hombros}
              onChange={(v) => handleChange("hombros", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orbita-secondary">Bíceps</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField
              label="Derecho"
              value={form.bicepsDer}
              onChange={(v) => handleChange("bicepsDer", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="Izquierdo"
              value={form.bicepsIzq}
              onChange={(v) => handleChange("bicepsIzq", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orbita-secondary">Cuádriceps</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField
              label="Derecho"
              value={form.cuadricepsDer}
              onChange={(v) => handleChange("cuadricepsDer", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
            <NumberUnitField
              label="Izquierdo"
              value={form.cuadricepsIzq}
              onChange={(v) => handleChange("cuadricepsIzq", v)}
              unit="cm"
              step="0.1"
              disabled={bodyMeasuresLocked}
            />
          </div>
          <NumberUnitField
            label="Glúteos"
            value={form.gluteos}
            onChange={(v) => handleChange("gluteos", v)}
            unit="cm"
            step="0.1"
            disabled={bodyMeasuresLocked}
          />
        </CheckinSection>
        </div>
        )}
      </div>

      <div className="sticky bottom-2 z-10 pt-2 sm:bottom-4">
        <div
          className={`rounded-2xl transition-[box-shadow,transform] duration-300 motion-safe:duration-300 ${
            savePhase === "success"
              ? "motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-300 ring-2 ring-[color-mix(in_srgb,var(--color-accent-health)_55%,transparent)] ring-offset-2 ring-offset-[var(--color-background)]"
              : ""
          }`}
        >
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={savePhase === "loading" || savePhase === "success" || saveDisabled}
            className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px] sm:text-[13px] ${
              savePhase === "success"
                ? "bg-[var(--color-accent-health)] shadow-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200"
                : "bg-[var(--color-accent-primary)] shadow-[color-mix(in_srgb,var(--color-accent-primary)_32%,transparent)]"
            }`}
          >
            {savePhase === "loading" ? (
              <>
                <span
                  className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
                  aria-hidden
                />
                Guardando…
              </>
            ) : savePhase === "success" ? (
              <>
                <Check className="h-6 w-6 shrink-0 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300" strokeWidth={2.75} aria-hidden />
                <span className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">Guardado</span>
              </>
            ) : saveDisabled ? (
              <>
                <Save className="h-5 w-5 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
                Guardar desactivado
              </>
            ) : (
              <>
                <Save className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                {saveCtaLabel(viewport)}
              </>
            )}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {savePhase === "success" ? "Check-in guardado correctamente." : ""}
        </p>
        {submitError ? (
          <p className="mt-2 text-center text-xs leading-snug text-[var(--color-accent-danger)]">{submitError}</p>
        ) : null}
        {saveDisabled && (
          <p className="mt-2 text-center text-xs text-[var(--color-accent-danger)]">{UI_CHECKIN_SAVE_DISABLED_FOOTER}</p>
        )}
      </div>
    </div>
  )
}
