"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  Cloud,
  Droplets,
  Dumbbell,
  Heart,
  Moon,
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
  TimeField,
  ToggleRow,
} from "./CheckinFields"
import { CheckinSection } from "./CheckinSection"
import { formatLocalDateKey } from "@/lib/agenda/localDateKey"
import { addDaysIso } from "@/lib/habits/habitMetrics"

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

export default function CheckinPage() {
  /** Día civil en la zona de agenda (no UTC), para no adelantar “mañana” por la noche. */
  const today = formatLocalDateKey(new Date())
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
  })

  const [loading, setLoading] = useState(false)
  const [preloadStatus, setPreloadStatus] = useState<string | null>(null)
  const [apiNotice, setApiNotice] = useState<string | null>(null)
  const [apiFlags, setApiFlags] = useState<CheckinApiFlags | null>(null)
  const [viewport, setViewport] = useState<CheckinViewport>("full")

  const supabaseOnFromEnv = isSupabaseEnabled()
  const mockOnFromEnv = isAppMockMode()
  const supabaseOn = apiFlags?.supabasePersistenceEnabled ?? supabaseOnFromEnv
  const mockOn = apiFlags?.appMode === "mock" || mockOnFromEnv
  const saveDisabled = !supabaseOn && !mockOn

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

  const handleChange = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (saveDisabled) {
      alert(CHECKIN_SUPABASE_DISABLED_MESSAGE)
      return
    }
    if (!form.calidadSueno || !form.energia || !form.estadoAnimo) {
      alert("Completa los campos principales")
      return
    }

    setLoading(true)
    try {
      const headers = await buildJsonHeaders()
      const payload = {
        ...form,
        source: form.source || (form.sheet_row_id ? "sheets" : "manual"),
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
        const extra = json.hint ? `\n\n${json.hint}` : ""
        alert(messageForHttpError(res.status, json.error, res.statusText) + extra)
        return
      }
      if (json.flags) setApiFlags(json.flags)
      if (json.mock) {
        alert("Check-in simulado (modo mock).")
      } else {
        alert("Check-in guardado")
      }
    } catch {
      alert("Error de red al guardar")
    } finally {
      setLoading(false)
    }
  }

  const chipBase =
    "min-h-[40px] rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition active:scale-[0.98] sm:min-h-0 sm:py-2"

  return (
    <div className="relative mx-auto max-w-2xl space-y-4 px-2 pb-28 pt-1 sm:space-y-5 sm:px-0 sm:pb-32">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {mockOn && (
            <p
              role="alert"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900"
            >
              {UI_CHECKIN_BANNER_MOCK}
            </p>
          )}
          {!mockOn && !supabaseOn && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">
              {UI_CHECKIN_BANNER_NO_CLOUD}
            </p>
          )}
          {apiNotice && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800">{apiNotice}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <Link
            href="/hoy"
            className="inline-flex min-h-[40px] items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:min-h-0"
          >
            ← Hoy
          </Link>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${
              supabaseOn
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-slate-100 text-slate-600"
            }`}
            title={`App: ${mockOn ? "mock" : getAppMode()} · Supabase check-in: ${supabaseOn ? "on" : "off"}${apiFlags ? " · sync API" : ""}`}
          >
            Supabase {supabaseOn ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {preloadStatus && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{preloadStatus}</p>
      )}

      {/* Cabecera página (referencia Figma) */}
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
            <Calendar className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Check-in diario</h1>
            <p className="mt-1 text-sm text-slate-500">
              Elige un momento o el formulario completo. Los datos se comparten entre vistas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`${chipBase} ${form.hoy ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600"}`}
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
                className={`${chipBase} ${form.ayer ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600"}`}
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
        <label className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[200px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha</span>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => {
              handleChange("fecha", e.target.value)
              handleChange("hoy", e.target.value === today)
              handleChange("ayer", false)
            }}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"
            aria-label="Fecha del check-in"
          />
        </label>
      </header>

      <nav
        aria-label="Parte del formulario a mostrar"
        className="rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[var(--shadow-card)] ring-1 ring-slate-100/80"
      >
        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-4 sm:gap-px sm:bg-slate-200/60 sm:p-px">
          {VIEWPORT_TABS.map((tab) => {
            const active = viewport === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewportAndUrl(tab.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-center transition sm:min-h-[52px] sm:rounded-md ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-50/80 text-slate-600 hover:bg-slate-100 sm:bg-white"
                }`}
              >
                <span className="text-[11px] font-semibold tracking-tight sm:text-xs">{tab.label}</span>
                <span
                  className={`hidden text-[9px] leading-tight sm:block ${active ? "text-violet-100" : "text-slate-400"}`}
                >
                  {tab.hint}
                </span>
              </button>
            )
          })}
        </div>
        {viewport !== "full" ? (
          <p className="m-0 border-t border-slate-100 px-3 py-2 text-center text-[11px] leading-snug text-slate-500">
            Vista reducida: solo editas este bloque. Al guardar se envía el formulario entero (otros campos conservan lo que ya tenías o valores por defecto).
          </p>
        ) : null}
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
          headerTintClass="bg-gradient-to-r from-orange-50 to-amber-50/80"
          iconBoxClass="bg-orange-100 text-orange-600"
        >
          <TimeField label="Hora despertar" icon={Clock} value={form.horaDespertar} onChange={(v) => handleChange("horaDespertar", v)} />
          <SliderRow
            label="Calidad del sueño"
            value={form.calidadSueno}
            onChange={(n) => handleChange("calidadSueno", n)}
            accentClass="accent-orange-500"
          />
          <SliderRow
            label="Nivel de energía"
            value={form.energia}
            onChange={(n) => handleChange("energia", n)}
            accentClass="accent-violet-600"
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
          headerTintClass="bg-gradient-to-r from-amber-50 to-yellow-50/70"
          iconBoxClass="bg-amber-100 text-amber-700"
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
            accentClass="accent-amber-500"
          />
        </CheckinSection>

        <CheckinSection
          title="Entrenamiento & Fitness"
          subtitle="Sesión del día"
          icon={Dumbbell}
          headerTintClass="bg-gradient-to-r from-emerald-50 to-teal-50/70"
          iconBoxClass="bg-emerald-100 text-emerald-700"
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
          headerTintClass="bg-gradient-to-r from-pink-50 to-violet-50/60"
          iconBoxClass="bg-pink-100 text-pink-600"
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
            accentClass="accent-pink-500"
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
          headerTintClass="bg-gradient-to-r from-slate-100 to-indigo-50/80"
          iconBoxClass="bg-indigo-100 text-indigo-700"
        >
          <TimeField label="Hora dormir" icon={Clock} value={form.horaDormir} onChange={(v) => handleChange("horaDormir", v)} />
          <SliderRow
            label="Descanso percibido (día)"
            value={form.descanso}
            onChange={(n) => handleChange("descanso", n)}
            accentClass="accent-slate-500"
          />
          <SliderRow
            label="Estado de ánimo"
            icon={Smile}
            value={form.estadoAnimo}
            onChange={(n) => handleChange("estadoAnimo", n)}
            accentClass="accent-indigo-500"
          />
          <SliderRow
            label="Nivel de ansiedad"
            icon={Cloud}
            value={form.ansiedad}
            onChange={(n) => handleChange("ansiedad", n)}
            accentClass="accent-sky-500"
          />
        </CheckinSection>

        <CheckinSection
          title="Medidas & Composición Corporal"
          subtitle="Opcional — precarga desde hoja si está configurada"
          icon={Ruler}
          headerTintClass="bg-gradient-to-r from-orange-50/90 to-rose-50/50"
          iconBoxClass="bg-orange-100 text-orange-700"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField label="Peso" value={form.peso} onChange={(v) => handleChange("peso", v)} unit="kg" step="0.1" />
            <NumberUnitField label="% grasa" value={form.pct_grasa} onChange={(v) => handleChange("pct_grasa", v)} unit="%" step="0.1" />
            <NumberUnitField label="Cintura" value={form.cintura} onChange={(v) => handleChange("cintura", v)} unit="cm" step="0.1" />
            <NumberUnitField label="Pecho" value={form.pecho} onChange={(v) => handleChange("pecho", v)} unit="cm" step="0.1" />
            <NumberUnitField label="Hombros" value={form.hombros} onChange={(v) => handleChange("hombros", v)} unit="cm" step="0.1" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bíceps</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField label="Derecho" value={form.bicepsDer} onChange={(v) => handleChange("bicepsDer", v)} unit="cm" step="0.1" />
            <NumberUnitField label="Izquierdo" value={form.bicepsIzq} onChange={(v) => handleChange("bicepsIzq", v)} unit="cm" step="0.1" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuádriceps</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberUnitField
              label="Derecho"
              value={form.cuadricepsDer}
              onChange={(v) => handleChange("cuadricepsDer", v)}
              unit="cm"
              step="0.1"
            />
            <NumberUnitField
              label="Izquierdo"
              value={form.cuadricepsIzq}
              onChange={(v) => handleChange("cuadricepsIzq", v)}
              unit="cm"
              step="0.1"
            />
          </div>
          <NumberUnitField label="Glúteos" value={form.gluteos} onChange={(v) => handleChange("gluteos", v)} unit="cm" step="0.1" />
        </CheckinSection>
        </div>
        )}
      </div>

      <div className="sticky bottom-2 z-10 pt-2 sm:bottom-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || saveDisabled}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[56px] sm:text-[13px]"
        >
          <Save className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          {loading ? "Guardando…" : saveDisabled ? "Guardar desactivado" : "Guardar check-in completo"}
        </button>
        {saveDisabled && (
          <p className="mt-2 text-center text-xs text-rose-700">{UI_CHECKIN_SAVE_DISABLED_FOOTER}</p>
        )}
      </div>
    </div>
  )
}
