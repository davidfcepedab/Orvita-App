"use client"

import { useMemo, useState, type DragEvent, type ReactNode } from "react"
import Link from "next/link"
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  RotateCcw,
  Save,
} from "lucide-react"
import { AgendaOrvitaMiniCard } from "@/app/agenda/AgendaOrvitaMiniCard"
import { AgendaOrvitaTaskCard } from "@/app/agenda/AgendaOrvitaTaskCard"
import { AgendaReadonlyUnifiedCard } from "@/app/agenda/AgendaReadonlyUnifiedCard"
import { googleReadonlyCardChrome } from "@/app/agenda/agendaCardChrome"
import { GoogleReminderQuickBar } from "@/app/agenda/GoogleReminderQuickBar"
import {
  getTaskCardStudioGoogleReminderSample,
  TASK_CARD_STUDIO_HOUSEHOLD_MEMBERS,
  TASK_CARD_STUDIO_SAMPLE,
  TASK_CARD_STUDIO_SAMPLE_COMPLETED,
} from "@/app/agenda/taskCardStudioSample"
import {
  TASK_CARD_GRID,
  allTaskCardCssVarKeys,
  taskCardDensityVars,
  type TaskCardDensity,
  type TaskCardGridKey,
} from "@/app/agenda/taskCardConfig"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Textarea } from "@/src/components/ui/textarea"

const ROW_LABELS: Record<string, string> = {
  title: "Título",
  meta: "Metadata (tiempo / timeline)",
  pills: "Badges (prioridad · estado)",
  assign: "Asignación / aceptar",
  extra: "Extra (asignación corta)",
  footer: "Pie (fuente · notas)",
  fuente: "Línea fuente (Google)",
}

const FONT_PRESETS: { value: string; label: string }[] = [
  { value: "", label: "Predeterminado (tema)" },
  { value: "ui-sans-serif, system-ui, sans-serif", label: "System UI" },
  { value: "Inter, ui-sans-serif, system-ui, sans-serif", label: "Inter" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "ui-monospace, SFMono-Regular, monospace", label: "Monospace" },
]

const WEIGHT_PRESETS = [
  { value: "", label: "Semibold (600)" },
  { value: "400", label: "Regular 400" },
  { value: "500", label: "Medium 500" },
  { value: "600", label: "Semibold 600" },
  { value: "700", label: "Bold 700" },
]

function pxFromVar(v: string | undefined, fallback: number): number {
  if (!v?.trim()) return fallback
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(v.trim())
  return m ? Number(m[1]) : fallback
}

function hexToCss(hex: string, fallback: string): string {
  const t = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t
  return fallback
}

function cssColorToHex(css: string | undefined, fallback = "#888888"): string {
  if (!css?.trim()) return fallback
  const m = /^#([0-9a-fA-F]{6})$/.exec(css.trim())
  if (m) return `#${m[1]}`
  return fallback
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
      <h2 className="m-0 text-sm font-semibold">{title}</h2>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-secondary)]">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: "px" | ""
  onChange: (n: number) => void
  hint?: string
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-[var(--color-text-primary)]">{label}</Label>
        <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">
          {value}
          {unit}
        </span>
      </div>
      {hint ? <p className="text-[10px] text-[var(--color-text-secondary)]">{hint}</p> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--color-accent-health)]"
      />
    </div>
  )
}

function ColorPair({
  label,
  bgKey,
  fgKey,
  varOverrides,
  setVar,
}: {
  label: string
  bgKey: string
  fgKey: string
  varOverrides: Record<string, string>
  setVar: (k: string, v: string) => void
}) {
  const bg = varOverrides[bgKey] ?? ""
  const fg = varOverrides[fgKey] ?? ""
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--color-border)] p-2">
      <p className="m-0 text-[11px] font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-[10px]">Fondo</Label>
          <input
            type="color"
            aria-label={`${label} fondo`}
            value={cssColorToHex(bg, "#e2e8f0")}
            onChange={(e) => setVar(bgKey, e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0"
          />
          <Input
            className="h-8 w-28 font-mono text-[10px]"
            value={bg}
            placeholder="auto"
            onChange={(e) => setVar(bgKey, e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px]">Texto</Label>
          <input
            type="color"
            aria-label={`${label} texto`}
            value={cssColorToHex(fg, "#0f172a")}
            onChange={(e) => setVar(fgKey, e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0"
          />
          <Input
            className="h-8 w-28 font-mono text-[10px]"
            value={fg}
            placeholder="auto"
            onChange={(e) => setVar(fgKey, e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Reordenación: HTML5 DnD solo desde el asa (evita conflictos con clicks en el resto de la fila).
 * Botones ↑↓ para trackpad/táctil y si el navegador bloquea drag.
 */
function RowOrderList({ slot }: { slot: TaskCardGridKey }) {
  const { getRowOrder, moveRowInSlot, resetRowOrderForSlot } = useTaskCardDesign()
  const order = getRowOrder(slot)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const onHandleDragStart = (e: DragEvent, index: number) => {
    e.stopPropagation()
    setDragFrom(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
    try {
      e.dataTransfer.setData("application/x-orvita-row", String(index))
    } catch {
      /* ignore */
    }
  }

  const onListDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const onRowDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
  }

  const onRowDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const raw =
      e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("application/x-orvita-row")
    const from = Number.parseInt(raw, 10)
    if (!Number.isFinite(from)) {
      setDragFrom(null)
      return
    }
    if (from !== dropIndex) moveRowInSlot(slot, from, dropIndex)
    setDragFrom(null)
  }

  const onDragEnd = () => setDragFrom(null)

  function moveUp(index: number) {
    if (index <= 0) return
    moveRowInSlot(slot, index, index - 1)
  }

  function moveDown(index: number) {
    if (index >= order.length - 1) return
    moveRowInSlot(slot, index, index + 1)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[10px] text-[var(--color-text-secondary)]">
          Arrastra solo el asa ⋮⋮, o usa ↑↓. (El arrastre desde toda la fila falla en algunos navegadores.)
        </p>
        <button
          type="button"
          onClick={() => resetRowOrderForSlot(slot)}
          className="shrink-0 text-[10px] font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
        >
          Orden por defecto
        </button>
      </div>
      <ul className="m-0 list-none space-y-1 p-0" role="list" onDragOver={onListDragOver}>
        {order.map((id, index) => (
          <li
            key={id}
            data-row-index={index}
            onDragOver={onRowDragOver}
            onDrop={(e) => onRowDrop(e, index)}
            className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 sm:gap-2 sm:px-2 sm:py-1.5"
            style={{
              opacity: dragFrom === index ? 0.65 : 1,
            }}
          >
            <div
              draggable
              role="button"
              tabIndex={0}
              aria-label={`Arrastrar fila ${ROW_LABELS[id] ?? id}`}
              onDragStart={(e) => onHandleDragStart(e, index)}
              onDragEnd={onDragEnd}
              className="touch-none cursor-grab select-none rounded p-1 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">{id}</span>{" "}
              <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                {ROW_LABELS[id] ?? id}
              </span>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                className="rounded border border-[var(--color-border)] p-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"
                aria-label="Subir"
                disabled={index === 0}
                onClick={() => moveUp(index)}
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className="rounded border border-[var(--color-border)] p-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"
                aria-label="Bajar"
                disabled={index >= order.length - 1}
                onClick={() => moveDown(index)}
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TaskCardStudioPanel() {
  const {
    hydrated,
    varOverrides,
    gridOverrides,
    setVarOverride,
    clearVarOverride,
    setGridOverride,
    resetAll,
    saveNow,
    exportJson,
  } = useTaskCardDesign()

  const [density, setDensity] = useState<TaskCardDensity>("kanban")
  const [saveFlash, setSaveFlash] = useState(false)
  const [showAdvancedGrid, setShowAdvancedGrid] = useState(false)
  /** Cajas naranjas = regiones del grid (no el texto suelto). Por defecto apagado para ver la tarjeta limpia. */
  const [showGridGuides, setShowGridGuides] = useState(false)

  const defaults = useMemo(() => taskCardDensityVars(density) as Record<string, string>, [density])
  const orvitaVariant = density === "list" ? "list" : "kanban"
  const advancedKeys = useMemo(() => allTaskCardCssVarKeys(), [])
  const studioGoogleReminder = useMemo(() => getTaskCardStudioGoogleReminderSample(), [])
  const fontFamilyValue = varOverrides["--task-card-font-family"] ?? ""
  const fontSelectValue = FONT_PRESETS.some((f) => f.value === fontFamilyValue)
    ? fontFamilyValue
    : "__custom__"

  function setVar(key: string, value: string) {
    setVarOverride(key, value)
  }

  const pad = pxFromVar(varOverrides["--task-card-pad"], pxFromVar(defaults["--task-card-pad"], 10))
  const gap = pxFromVar(varOverrides["--task-card-gap"], pxFromVar(defaults["--task-card-gap"], 6))
  const gapTight = pxFromVar(
    varOverrides["--task-card-gap-tight"],
    pxFromVar(defaults["--task-card-gap-tight"], 4),
  )
  const radius = pxFromVar(varOverrides["--task-card-radius"], pxFromVar(defaults["--task-card-radius"], 12))
  const titlePx = pxFromVar(varOverrides["--task-card-title-size"], pxFromVar(defaults["--task-card-title-size"], 13))
  const metaPx = pxFromVar(varOverrides["--task-card-meta-size"], pxFromVar(defaults["--task-card-meta-size"], 10))
  const pillPx = pxFromVar(varOverrides["--task-card-pill-size"], pxFromVar(defaults["--task-card-pill-size"], 9))
  const minH = pxFromVar(varOverrides["--task-card-min-height"], 0)

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(exportJson())
    } catch {
      window.alert("No se pudo copiar al portapapeles.")
    }
  }

  function handleSave() {
    saveNow()
    setSaveFlash(true)
    window.setTimeout(() => setSaveFlash(false), 1600)
  }

  return (
    <div
      className="min-h-dvh text-[var(--color-text-primary)]"
      style={{ background: "var(--agenda-shell-bg, var(--color-surface))" }}
    >
      <header
        className="sticky top-0 z-20 border-b border-[var(--color-border)] px-4 py-3 lg:px-8"
        style={{ background: "var(--agenda-elevated-bg, var(--color-surface-alt))" }}
      >
        <div className="mx-auto flex max-w-[1700px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-lg font-semibold tracking-tight">Modo estudio · tarjetas</h1>
            <p className="m-0 mt-1 max-w-2xl text-[11px] leading-snug text-[var(--color-text-secondary)]">
              Edición visual: arrastra bloques, sliders y colores. Un solo origen de datos (
              <code className="rounded bg-[var(--color-surface)] px-1">TaskCardDesignProvider</code>
              ) alimenta Kanban, Lista, Semana y Mes. Autoguardado en localStorage; usa Guardar para forzar escritura.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/agenda"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold"
            >
              Volver a agenda
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[11px] font-semibold"
              style={{
                background: saveFlash
                  ? "color-mix(in srgb, var(--color-accent-health) 22%, var(--color-surface-alt))"
                  : "var(--color-surface-alt)",
              }}
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saveFlash ? "Guardado" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copiar JSON
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Borrar todos los overrides del estudio?")) resetAll()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[11px] font-semibold text-[var(--color-accent-danger)]"
              style={{ background: "color-mix(in srgb, var(--color-accent-danger) 8%, var(--color-surface-alt))" }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Restablecer todo
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-8 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-5 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
          {!hydrated ? <p className="text-sm text-[var(--color-text-secondary)]">Cargando…</p> : null}

          <Section
            title="Vista previa · densidad"
            hint="La tarjeta grande usa Kanban/Lista; la mini siempre compacta. Colores y fuente aplican a todas."
          >
            <div className="flex flex-wrap gap-2">
              {(["kanban", "list", "compact"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: "var(--color-border)",
                    background:
                      density === d
                        ? "color-mix(in srgb, var(--color-accent-health) 14%, transparent)"
                        : "transparent",
                  }}
                >
                  {d === "kanban" ? "Kanban" : d === "list" ? "Lista" : "Compacta"}
                </button>
              ))}
            </div>
          </Section>

          <Section
            title="Estructura (drag & drop)"
            hint="Órvita (Kanban/Lista) → plantilla «orvita». Semana/Mes mini → «mini». Todo Google Calendar/Tasks en agenda → «readonly». Cada lista ordena filas del grid; en la agenda real cada tipo de ítem usa ya la plantilla que le toca."
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="m-0 mb-2 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  Órvita · tarjeta completa
                </p>
                <RowOrderList slot="orvita" />
              </div>
              <div>
                <p className="m-0 mb-2 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  Mini · semana / mes
                </p>
                <RowOrderList slot="mini" />
              </div>
              <div>
                <p className="m-0 mb-2 text-[11px] font-semibold text-[var(--color-text-primary)]">
                  Google · unificado
                </p>
                <RowOrderList slot="readonly" />
              </div>
            </div>
          </Section>

          <Section title="Espaciado y forma" hint="Valores en píxeles; se escriben como tokens CSS en las variables.">
            <div className="flex flex-col gap-4">
              <SliderRow
                label="Padding interno"
                value={pad}
                min={4}
                max={28}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-pad", `${n}px`)}
              />
              <SliderRow
                label="Gap del grid"
                value={gap}
                min={0}
                max={20}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-gap", `${n}px`)}
              />
              <SliderRow
                label="Gap pastillas / secundario"
                value={gapTight}
                min={0}
                max={14}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-gap-tight", `${n}px`)}
              />
              <SliderRow
                label="Border radius"
                value={radius}
                min={0}
                max={24}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-radius", `${n}px`)}
              />
              <SliderRow
                label="Altura mínima (0 = automático)"
                value={minH}
                min={0}
                max={200}
                step={4}
                unit="px"
                onChange={(n) => setVar("--task-card-min-height", n > 0 ? `${n}px` : "")}
                hint="Solo afecta si el valor es &gt; 0."
              />
            </div>
          </Section>

          <Section title="Tipografía" hint="Tamaños en px; peso del título como número CSS.">
            <div className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Familia</Label>
                <select
                  className="h-10 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-primary)]"
                  value={fontSelectValue}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "__custom__") return
                    setVar("--task-card-font-family", v)
                  }}
                  aria-label="Familia tipográfica (preset)"
                >
                  {FONT_PRESETS.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                  <option value="__custom__">Personalizada (campo abajo)</option>
                </select>
                <Input
                  className="font-mono text-xs"
                  placeholder="ej. Inter, sans-serif"
                  value={varOverrides["--task-card-font-family"] ?? ""}
                  onChange={(e) => setVar("--task-card-font-family", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Peso del título</Label>
                <select
                  className="h-10 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px]"
                  value={varOverrides["--task-card-font-weight-title"] ?? ""}
                  onChange={(e) => setVar("--task-card-font-weight-title", e.target.value)}
                >
                  {WEIGHT_PRESETS.map((w) => (
                    <option key={w.label} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <SliderRow
                label="Título"
                value={titlePx}
                min={10}
                max={22}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-title-size", `${n}px`)}
              />
              <SliderRow
                label="Metadata / timeline"
                value={metaPx}
                min={8}
                max={16}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-meta-size", `${n}px`)}
              />
              <SliderRow
                label="Pastillas"
                value={pillPx}
                min={7}
                max={14}
                step={1}
                unit="px"
                onChange={(n) => setVar("--task-card-pill-size", `${n}px`)}
              />
            </div>
          </Section>

          <Section title="Color" hint="Prioridad ALTA / MEDIA / BAJA en pastillas Órvita. Fondo y borde de la tarjeta.">
            <div className="flex flex-col gap-3">
              <div className="grid gap-2">
                <Label className="text-[11px]">Fondo · todas (fallback)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Fondo tarjeta global"
                    value={cssColorToHex(varOverrides["--task-card-surface-bg"], "#ffffff")}
                    onChange={(e) => setVar("--task-card-surface-bg", hexToCss(e.target.value, "#ffffff"))}
                    className="h-9 w-14 cursor-pointer rounded border border-[var(--color-border)] p-0"
                  />
                  <Input
                    className="min-w-[12rem] flex-1 font-mono text-xs"
                    value={varOverrides["--task-card-surface-bg"] ?? ""}
                    placeholder="vacío = tema"
                    onChange={(e) => setVar("--task-card-surface-bg", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border border-[var(--color-border)] border-dashed p-2">
                <Label className="text-[11px]">Fondo solo Órvita (tareas creadas / asignadas en Órvita)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Fondo Órvita"
                    value={cssColorToHex(varOverrides["--task-card-surface-bg-orvita"], "#f8fafc")}
                    onChange={(e) => setVar("--task-card-surface-bg-orvita", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-[var(--color-border)] p-0"
                  />
                  <Input
                    className="min-w-[10rem] flex-1 font-mono text-xs"
                    value={varOverrides["--task-card-surface-bg-orvita"] ?? ""}
                    placeholder="opcional"
                    onChange={(e) => setVar("--task-card-surface-bg-orvita", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border border-[var(--color-border)] border-dashed p-2">
                <Label className="text-[11px]">Fondo solo Google (Calendar + Tasks / recordatorios)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Fondo Google"
                    value={cssColorToHex(varOverrides["--task-card-surface-bg-readonly"], "#f8fafc")}
                    onChange={(e) => setVar("--task-card-surface-bg-readonly", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-[var(--color-border)] p-0"
                  />
                  <Input
                    className="min-w-[10rem] flex-1 font-mono text-xs"
                    value={varOverrides["--task-card-surface-bg-readonly"] ?? ""}
                    placeholder="opcional"
                    onChange={(e) => setVar("--task-card-surface-bg-readonly", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px]">Borde contenedor (tarjeta completa)</Label>
                <Input
                  className="font-mono text-xs"
                  placeholder="0.5px solid var(--color-border)"
                  value={varOverrides["--task-card-chrome-border"] ?? ""}
                  onChange={(e) => setVar("--task-card-chrome-border", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px]">Color de borde 1px (mini / fallback)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    aria-label="Color borde"
                    value={cssColorToHex(varOverrides["--task-card-border-color"], "#cbd5e1")}
                    onChange={(e) => setVar("--task-card-border-color", hexToCss(e.target.value, "#cbd5e1"))}
                    className="h-9 w-14 cursor-pointer rounded border border-[var(--color-border)] p-0"
                  />
                  <Input
                    className="min-w-[10rem] flex-1 font-mono text-xs"
                    value={varOverrides["--task-card-border-color"] ?? ""}
                    placeholder="var(--color-border)"
                    onChange={(e) => setVar("--task-card-border-color", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-[11px]">Color título</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cssColorToHex(varOverrides["--task-card-title-color"], "#0f172a")}
                      onChange={(e) => setVar("--task-card-title-color", e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border p-0"
                    />
                    <Input
                      className="font-mono text-xs"
                      value={varOverrides["--task-card-title-color"] ?? ""}
                      onChange={(e) => setVar("--task-card-title-color", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[11px]">Color metadata</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cssColorToHex(varOverrides["--task-card-meta-color"], "#64748b")}
                      onChange={(e) => setVar("--task-card-meta-color", e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border p-0"
                    />
                    <Input
                      className="font-mono text-xs"
                      value={varOverrides["--task-card-meta-color"] ?? ""}
                      onChange={(e) => setVar("--task-card-meta-color", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <ColorPair
                label="Prioridad ALTA"
                bgKey="--task-card-priority-alta-bg"
                fgKey="--task-card-priority-alta-fg"
                varOverrides={varOverrides}
                setVar={setVar}
              />
              <ColorPair
                label="Prioridad MEDIA"
                bgKey="--task-card-priority-media-bg"
                fgKey="--task-card-priority-media-fg"
                varOverrides={varOverrides}
                setVar={setVar}
              />
              <ColorPair
                label="Prioridad BAJA"
                bgKey="--task-card-priority-baja-bg"
                fgKey="--task-card-priority-baja-fg"
                varOverrides={varOverrides}
                setVar={setVar}
              />
            </div>
          </Section>

          <Section
            title="Avanzado · grid CSS crudo"
            hint="Opcional. Si hay texto aquí para una plantilla, sustituye al orden por arrastre de esa plantilla."
          >
            <button
              type="button"
              onClick={() => setShowAdvancedGrid((v) => !v)}
              className="mb-2 text-[11px] font-semibold text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
            >
              {showAdvancedGrid ? "Ocultar" : "Mostrar"} editores
            </button>
            {showAdvancedGrid ? (
              <div className="flex flex-col gap-3">
                {(["orvita", "mini", "readonly"] as const).map((slot) => (
                  <div key={slot} className="grid gap-1">
                    <Label className="font-mono text-[10px]">{slot}</Label>
                    <Textarea
                      value={gridOverrides[slot] ?? ""}
                      placeholder={TASK_CARD_GRID[slot]}
                      onChange={(e) => setGridOverride(slot, e.target.value)}
                      className="min-h-[64px] font-mono text-[10px]"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Todas las variables (lista)" hint="Cualquier token adicional; vacío = código por defecto.">
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {advancedKeys.map((key) => (
                <div key={key} className="grid gap-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] text-[var(--color-text-secondary)]">{key}</span>
                    <button
                      type="button"
                      onClick={() => clearVarOverride(key)}
                      className="text-[9px] text-[var(--color-accent-primary)] hover:underline"
                    >
                      limpiar
                    </button>
                  </div>
                  <Input
                    className="h-8 font-mono text-[10px]"
                    value={varOverrides[key] ?? ""}
                    placeholder={(defaults as Record<string, string>)[key] ?? "—"}
                    onChange={(e) => setVarOverride(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
              <span>Vista previa en vivo · misma config que las 4 vistas de agenda</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showGridGuides}
                onChange={(e) => setShowGridGuides(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-accent-health)]"
              />
              <span>Ver cajas del grid (áreas)</span>
            </label>
          </div>
          <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">
            Las guías son bordes punteados por <strong>celda del grid</strong> (title, meta, pills…), no por cada línea
            de texto. En <Link href="/agenda" className="font-semibold text-[var(--color-accent-primary)] underline">/agenda</Link>{" "}
            (Lista o Columnas) los controles de vence, prioridad, responsable y “marcar hecha” son reales; aquí la vista
            previa usa datos de muestra y no guarda en servidor.
          </p>

          <Section title="Órvita · Kanban / Lista (controles como en producción)">
            <div className="max-w-xl">
              <AgendaOrvitaTaskCard
                task={TASK_CARD_STUDIO_SAMPLE}
                variant={orvitaVariant}
                designDensity={density}
                iterationMode={showGridGuides}
                householdMembers={TASK_CARD_STUDIO_HOUSEHOLD_MEMBERS}
                onPatchOrvita={async () => {}}
                onSaveComplete={async () => {}}
                onDelete={async () => {}}
                onAcceptAssignment={async () => {}}
              />
            </div>
          </Section>

          <Section title="Órvita · completada (verde suave)">
            <div className="max-w-xl">
              <AgendaOrvitaTaskCard
                task={TASK_CARD_STUDIO_SAMPLE_COMPLETED}
                variant={orvitaVariant}
                designDensity={density}
                iterationMode={showGridGuides}
                householdMembers={TASK_CARD_STUDIO_HOUSEHOLD_MEMBERS}
                onPatchOrvita={async () => {}}
                onSaveComplete={async () => {}}
                onDelete={async () => {}}
              />
            </div>
          </Section>

          <Section title="Órvita · mini">
            <div className="max-w-sm">
              <AgendaOrvitaMiniCard task={TASK_CARD_STUDIO_SAMPLE} iterationMode={showGridGuides} />
            </div>
          </Section>

          <Section title="Google Calendar · muestra (morado suave)">
            <div className="max-w-xl">
              <AgendaReadonlyUnifiedCard
                variant={density === "compact" ? "compact" : density === "list" ? "list" : "kanban"}
                borderLeft="4px solid var(--agenda-calendar)"
                chromeOverlay={googleReadonlyCardChrome({ kind: "calendar", completed: false })}
                title="Reunión · Planificación Q2"
                TimelineIcon={Calendar}
                timelineText="Hoy 16:00 · 1 h"
                googleKind="calendar"
                kindPillLabel="Calendar"
                fuente="Google Calendar"
                footNote="En /agenda no se edita responsable ni prioridad en Calendar (solo Tasks + Órvita)."
                badgeLetter="GC"
                badgeColorVar="var(--agenda-calendar)"
                editUrl="https://calendar.google.com"
                iterationMode={showGridGuides}
              />
            </div>
          </Section>

          <Section title="Google Tasks · recordatorio (navy suave + barra rápida)">
            <div className="max-w-xl">
              <AgendaReadonlyUnifiedCard
                variant={density === "compact" ? "compact" : density === "list" ? "list" : "kanban"}
                borderLeft="4px solid var(--agenda-reminder)"
                chromeOverlay={googleReadonlyCardChrome({ kind: "reminder", completed: false })}
                title={studioGoogleReminder.title}
                TimelineIcon={Bell}
                timelineText="Vence hoy · ejemplo"
                googleKind="reminder"
                kindPillLabel="Recordatorio"
                fuente="Google Tasks"
                footNote="Vista previa: en /agenda, con Google conectado y hogar cargado, esta barra guarda en Tasks y metadatos locales."
                footer={
                  <GoogleReminderQuickBar
                    task={studioGoogleReminder}
                    householdMembers={TASK_CARD_STUDIO_HOUSEHOLD_MEMBERS}
                    patchTask={async () => {}}
                  />
                }
                badgeLetter="GT"
                badgeColorVar="var(--agenda-reminder)"
                editUrl="https://tasks.google.com"
                iterationMode={showGridGuides}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
