"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Calendar, Copy, RotateCcw } from "lucide-react"
import { AgendaOrvitaMiniCard } from "@/app/agenda/AgendaOrvitaMiniCard"
import { AgendaOrvitaTaskCard } from "@/app/agenda/AgendaOrvitaTaskCard"
import { AgendaReadonlyUnifiedCard } from "@/app/agenda/AgendaReadonlyUnifiedCard"
import { TASK_CARD_STUDIO_SAMPLE } from "@/app/agenda/taskCardStudioSample"
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

const VAR_LABELS: Record<string, string> = {
  "--task-card-radius": "Radio (esquinas)",
  "--task-card-border-left": "Borde izquierdo (ancho token)",
  "--task-card-line-title": "Interlineado título",
  "--task-card-line-body": "Interlineado cuerpo",
  "--task-card-action-col-width": "Ancho columna acciones",
  "--task-card-check-size": "Tamaño check circular",
  "--task-card-pad": "Padding interno",
  "--task-card-gap": "Gap del grid",
  "--task-card-gap-tight": "Gap pastillas / filas",
  "--task-card-title-size": "Tamaño título",
  "--task-card-meta-size": "Tamaño meta / tiempo",
  "--task-card-pill-size": "Tamaño pastillas",
  "--task-card-fuente-size": "Tamaño “Fuente:” / notas",
  "--task-card-action-size": "Tamaño acciones / enlaces",
  "--task-card-icon-meta": "Icono meta (referencia)",
}

const GRID_HELP: Record<TaskCardGridKey, string> = {
  orvita: "Kanban y lista (columna acciones a la derecha). Áreas: title, meta, pills, assign, footer, actions.",
  mini: "Semana y mes. Áreas: title, meta, pills, extra, footer.",
  readonly: "Google unificado. Áreas: title, meta, pills, fuente, footer, actions.",
}

function labelForVar(key: string): string {
  return VAR_LABELS[key] ?? key.replace(/^--task-card-/, "").replace(/-/g, " ")
}

function defaultsRecord(density: TaskCardDensity): Record<string, string> {
  return { ...(taskCardDensityVars(density) as Record<string, string>) }
}

export function TaskCardStudioPanel() {
  const {
    hydrated,
    varOverrides,
    gridOverrides,
    setVarOverride,
    clearVarOverride,
    setGridOverride,
    clearGridOverride,
    resetAll,
  } = useTaskCardDesign()

  const [density, setDensity] = useState<TaskCardDensity>("kanban")
  const keys = useMemo(() => allTaskCardCssVarKeys(), [])
  const defaults = useMemo(() => defaultsRecord(density), [density])

  const orvitaVariant = density === "list" ? "list" : "kanban"

  async function copyJson() {
    const payload = {
      vars: varOverrides,
      grids: gridOverrides,
      note: "Pegar valores en taskCardConfig.ts o conservar en localStorage (automático).",
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    } catch {
      window.alert("No se pudo copiar al portapapeles.")
    }
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
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-lg font-semibold tracking-tight">Tarjeta maestra · estudio</h1>
            <p className="m-0 mt-1 max-w-2xl text-[11px] leading-snug text-[var(--color-text-secondary)]">
              Ajustes en vivo guardados en este navegador (localStorage). Las cuatro vistas de agenda usan los mismos
              tokens y plantillas. Tras editar, recarga la pestaña de la agenda si está abierta en la misma ventana.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/agenda"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[color-mix(in_srgb,var(--color-border)_12%,var(--color-surface-alt))]"
            >
              Volver a agenda
            </Link>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-[11px] font-semibold text-[var(--color-text-primary)]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copiar JSON
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Restaurar valores por defecto del código y borrar overrides guardados?")) {
                  resetAll()
                }
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

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-8 lg:px-8 lg:py-6">
        <div className="flex min-h-0 flex-col gap-5 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
          {!hydrated ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Cargando overrides guardados…</p>
          ) : null}

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Densidad de la vista previa principal</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              La tarjeta mini siempre usa preset compact. Google de muestra sigue la densidad elegida.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["kanban", "list", "compact"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: "var(--color-border)",
                    background: density === d ? "color-mix(in srgb, var(--color-accent-health) 14%, transparent)" : "transparent",
                    color: density === d ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}
                >
                  {d === "kanban" ? "Kanban" : d === "list" ? "Lista" : "Compacta"}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Variables CSS</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Deja vacío para usar el valor del código. Placeholder = defecto para la densidad seleccionada arriba.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {keys.map((key) => (
                <div key={key} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={`var-${key}`} className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {key}
                    </Label>
                    <button
                      type="button"
                      onClick={() => clearVarOverride(key)}
                      className="shrink-0 text-[10px] font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
                    >
                      Defecto
                    </button>
                  </div>
                  <p className="m-0 text-[11px] text-[var(--color-text-primary)]">{labelForVar(key)}</p>
                  <Input
                    id={`var-${key}`}
                    value={varOverrides[key] ?? ""}
                    placeholder={defaults[key] ?? "—"}
                    onChange={(e) => setVarOverride(key, e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Grid (grid-template-areas)</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Una fila por comillas en CSS. Vacío = plantilla del código en taskCardConfig.ts.
            </p>
            {(["orvita", "mini", "readonly"] as const).map((slot) => (
              <div key={slot} className="mt-4 grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`grid-${slot}`} className="text-xs font-semibold capitalize">
                    {slot}
                  </Label>
                  <button
                    type="button"
                    onClick={() => clearGridOverride(slot)}
                    className="text-[10px] font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
                  >
                    Defecto
                  </button>
                </div>
                <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">{GRID_HELP[slot]}</p>
                <Textarea
                  id={`grid-${slot}`}
                  value={gridOverrides[slot] ?? ""}
                  placeholder={TASK_CARD_GRID[slot]}
                  onChange={(e) => setGridOverride(slot, e.target.value)}
                  className="min-h-[72px] font-mono text-[11px] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Órvita · tarjeta completa</h2>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Misma pieza que Kanban/Lista. Grid y variables con overlay de áreas.
            </p>
            <div className="mt-3 max-w-lg">
              <AgendaOrvitaTaskCard
                task={TASK_CARD_STUDIO_SAMPLE}
                variant={orvitaVariant}
                designDensity={density}
                iterationMode
                onSaveComplete={async () => {}}
                onDelete={async () => {}}
                onAcceptAssignment={async () => {}}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Órvita · mini (semana / mes)</h2>
            <div className="mt-3 max-w-sm">
              <AgendaOrvitaMiniCard task={TASK_CARD_STUDIO_SAMPLE} iterationMode />
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <h2 className="m-0 text-sm font-semibold">Google · solo lectura</h2>
            <div className="mt-3 max-w-lg">
              <AgendaReadonlyUnifiedCard
                variant={density === "compact" ? "compact" : density === "list" ? "list" : "kanban"}
                borderLeft="4px solid color-mix(in srgb, var(--color-accent-finance) 65%, transparent)"
                title="Reunión · Planificación Q2"
                TimelineIcon={Calendar}
                timelineText="Hoy 16:00 · 1 h"
                googleKind="calendar"
                kindPillLabel="Calendar"
                fuente="Google Calendar"
                footNote="Sala virtual · enlace en Calendar"
                badgeLetter="G"
                badgeColorVar="var(--color-accent-finance)"
                editUrl="https://calendar.google.com"
                iterationMode
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
