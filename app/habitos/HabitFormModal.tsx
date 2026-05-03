"use client"

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import { Clock, Loader2, Sparkles, Target, Trash2 } from "lucide-react"
import { weekdaysToLetters } from "@/lib/habits/habitMetrics"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Label } from "@/src/components/ui/label"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"
import { Checkbox } from "@/src/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { cn } from "@/lib/utils"
import {
  DEFAULT_WATER_BOTTLE_ML,
  DEFAULT_WATER_GLASS_ML,
  DEFAULT_WATER_GOAL_ML,
  suggestedWaterGoalMlFromWeightKg,
  WATER_SYSTEM_TRIGGER_OR_TIME,
} from "@/lib/habits/waterTrackingHelpers"
import type { HabitSuccessMetricType, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const

export type HabitModalFormValues = {
  name: string
  intention: string
  domainKey: OperationalDomain
  frequency: "diario" | "semanal"
  days: string[]
  superhabit: boolean
  successMetricType: HabitSuccessMetricType
  successMetricTarget: string
  sessionDurationMinutes: string
  triggerOrTime: string
  /** Solo hábito agua (no se crea desde UI genérica). */
  isWaterTracking: boolean
  waterBottleMl: string
  waterGoalMl: string
  waterGlassMl: string
  bodyWeightKg: string
  /** Varias respuestas Sí/No en el día (roadmap: push + checkpoints). */
  intradaySiNoProgress: boolean
  /** Meta de chequeos Sí/No en el día (1–24) cuando `intradaySiNoProgress`. */
  intradaySiNoTargetChecks: string
}

export const HABIT_MODAL_DEFAULT_VALUES: HabitModalFormValues = {
  name: "",
  intention: "",
  domainKey: "salud",
  frequency: "diario",
  days: ["L", "M", "X", "J", "V"],
  superhabit: false,
  successMetricType: "duracion",
  successMetricTarget: "",
  sessionDurationMinutes: "15",
  triggerOrTime: "",
  isWaterTracking: false,
  waterBottleMl: String(DEFAULT_WATER_BOTTLE_ML),
  waterGoalMl: String(DEFAULT_WATER_GOAL_ML),
  waterGlassMl: String(DEFAULT_WATER_GLASS_ML),
  bodyWeightKg: "",
  intradaySiNoProgress: false,
  intradaySiNoTargetChecks: "3",
}

export function emptyHabitModalForm(domain: OperationalDomain = "salud"): HabitModalFormValues {
  return { ...HABIT_MODAL_DEFAULT_VALUES, domainKey: domain }
}

export function habitToModalValues(habit: HabitWithMetrics): HabitModalFormValues {
  const m = habit.metadata
  const displayDays =
    m?.display_days?.length ? [...m.display_days] : weekdaysToLetters(m?.weekdays ?? [])
  const isWater = m?.habit_type === "water-tracking"
  const allDays = Array.from(DAY_LETTERS)
  return {
    name: habit.name,
    intention: m?.intention ?? "",
    domainKey: isWater ? "salud" : habit.domain,
    frequency: isWater ? "diario" : m?.frequency ?? "diario",
    days: isWater ? allDays : displayDays.length ? displayDays : [...HABIT_MODAL_DEFAULT_VALUES.days],
    superhabit: isWater ? false : Boolean(m?.is_superhabit),
    successMetricType: m?.success_metric_type ?? "duracion",
    successMetricTarget: m?.success_metric_target ?? "",
    sessionDurationMinutes:
      m?.estimated_session_minutes != null ? String(m.estimated_session_minutes) : HABIT_MODAL_DEFAULT_VALUES.sessionDurationMinutes,
    triggerOrTime: isWater ? WATER_SYSTEM_TRIGGER_OR_TIME : m?.trigger_or_time ?? "",
    isWaterTracking: isWater,
    waterBottleMl:
      m?.water_bottle_ml != null ? String(m.water_bottle_ml) : String(DEFAULT_WATER_BOTTLE_ML),
    waterGoalMl: m?.water_goal_ml != null ? String(m.water_goal_ml) : String(DEFAULT_WATER_GOAL_ML),
    waterGlassMl: m?.water_glass_ml != null ? String(m.water_glass_ml) : String(DEFAULT_WATER_GLASS_ML),
    bodyWeightKg: m?.body_weight_kg != null ? String(m.body_weight_kg) : "",
    intradaySiNoProgress: Boolean(m?.intraday_si_no_progress),
    intradaySiNoTargetChecks:
      m?.intraday_si_no_target_checks != null && Number.isFinite(m.intraday_si_no_target_checks)
        ? String(Math.min(24, Math.max(1, Math.round(m.intraday_si_no_target_checks))))
        : "3",
  }
}

const METRIC_OPTIONS: { value: HabitSuccessMetricType; label: string }[] = [
  { value: "duracion", label: "Duración" },
  { value: "repeticiones", label: "Repeticiones" },
  { value: "cantidad", label: "Cantidad" },
  { value: "si_no", label: "Sí / no" },
]

function metricTargetLabel(type: HabitSuccessMetricType): string {
  switch (type) {
    case "duracion":
      return "Meta (minutos o rango)"
    case "repeticiones":
      return "Repeticiones objetivo"
    case "cantidad":
      return "Cantidad objetivo"
    default:
      return "Nota (opcional)"
  }
}

function metricTargetPlaceholder(type: HabitSuccessMetricType): string {
  switch (type) {
    case "duracion":
      return "ej. 25 min de lectura profunda"
    case "repeticiones":
      return "ej. 10 flexiones"
    case "cantidad":
      return "ej. 2 litros de agua"
    default:
      return "ej. cumplir antes de las 21:00"
  }
}

function formatWeeklyMinutes(total: number): string {
  if (total <= 0) return "—"
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

type HabitFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: HabitWithMetrics | null
  form: HabitModalFormValues
  setForm: Dispatch<SetStateAction<HabitModalFormValues>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Solo en edición: elimina el hábito y cierra el modal si tiene éxito. */
  onDeleteHabit?: (habitId: string) => Promise<{ ok: boolean; error?: string }>
  superhabitCount: number
  persistenceEnabled: boolean
  mock: boolean
  domainLabels: Record<OperationalDomain, string>
}

export function HabitFormModal({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  onSubmit,
  onDeleteHabit,
  superhabitCount,
  persistenceEnabled,
  mock,
  domainLabels,
}: HabitFormModalProps) {
  const [deleting, setDeleting] = useState(false)
  const sessionsPerWeek = form.days.length
  const sessionMins = Math.max(0, Math.min(24 * 60, parseInt(form.sessionDurationMinutes, 10) || 0))
  const weeklyMinutes = sessionsPerWeek * sessionMins
  const canSave = persistenceEnabled || mock

  const handleDelete = async () => {
    if (!editing || !onDeleteHabit || deleting) return
    if (
      !confirm(
        "¿Eliminar este hábito del stack? También se borrarán las marcas de completado asociadas en Órvita."
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      const r = await onDeleteHabit(editing.id)
      if (!r.ok) {
        alert(r.error || "No se pudo eliminar")
        return
      }
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 sm:max-w-[520px]" showClose>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--color-accent-health) 14%, transparent)" }}
            >
              <Sparkles className="h-5 w-5 text-[var(--color-accent-health)]" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                {editing ? "Editar compromiso" : "Nuevo hábito"}
              </p>
              <DialogTitle className="text-left text-xl">
                {editing ? "Afinar tu sistema" : "Diseña un hábito que aguante la semana"}
              </DialogTitle>
              <DialogDescription className="text-left text-[13px] leading-relaxed">
                {form.isWaterTracking && editing
                  ? "Solo puedes ajustar meta, botellita y vaso. Nombre, dominio y ritmo los fija Órvita para que el seguimiento de ml sea coherente."
                  : editing
                    ? "Ajusta la intención y la métrica para que el seguimiento siga alineado con tu operativa."
                    : "Un hábito claro —con disparador y éxito medible— es más fácil de defender cuando el día se pone denso."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="max-h-[min(52vh,420px)] space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-4" aria-labelledby="habit-identity">
              <h3 id="habit-identity" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                Identidad
              </h3>
              {form.isWaterTracking ? (
                <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    Definido por Órvita (no editable)
                  </p>
                  <p className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]">{form.name}</p>
                  {form.intention.trim() ? (
                    <p className="m-0 text-[13px] leading-snug text-[var(--color-text-secondary)]">{form.intention}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="habit-name">Nombre del hábito</Label>
                    <Input
                      id="habit-name"
                      placeholder="ej. Bloque de trabajo profundo"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="habit-intention">Intención</Label>
                    <Textarea
                      id="habit-intention"
                      placeholder="¿Qué cambio real quieres anclar? Una frase breve basta."
                      value={form.intention}
                      onChange={(e) => setForm((p) => ({ ...p, intention: e.target.value }))}
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4 border-t border-[var(--color-border)] pt-5" aria-labelledby="habit-direction">
              <h3 id="habit-direction" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                Dirección
              </h3>
              {form.isWaterTracking ? (
                <div className="space-y-4">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Personalizá capacidad de botellita, meta diaria y vaso extra. El progreso, la racha y el riesgo de ruptura usan la meta en ml; «+1 Botellita» suma siempre la capacidad que indiques abajo.
                  </p>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                      Dominio
                    </p>
                    <p className="m-0 text-sm font-medium text-[var(--color-text-primary)]">{domainLabels.salud}</p>
                    <p className="m-0 mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                      Fijo en Salud: la misión de hidratación va ligada a la lógica de bienestar de Órvita.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="water-goal-ml">Meta diaria de agua (ml)</Label>
                      <Input
                        id="water-goal-ml"
                        type="number"
                        min={500}
                        max={8000}
                        inputMode="numeric"
                        value={form.waterGoalMl}
                        onChange={(e) => setForm((p) => ({ ...p, waterGoalMl: e.target.value }))}
                        aria-describedby="water-goal-hint"
                      />
                      <p id="water-goal-hint" className="text-[10px] leading-snug text-[var(--color-text-secondary)]">
                        Editá el valor a mano o usá «Calcular según mi perfil» con tu peso (fórmula: kg × 32 ml).
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="water-body-kg">Peso corporal (kg), opcional</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Input
                        id="water-body-kg"
                        type="number"
                        min={30}
                        max={250}
                        step="0.1"
                        inputMode="decimal"
                        className="sm:max-w-[10rem]"
                        placeholder="ej. 72"
                        value={form.bodyWeightKg}
                        onChange={(e) => setForm((p) => ({ ...p, bodyWeightKg: e.target.value }))}
                        aria-describedby="water-profile-calc-hint"
                      />
                      <button
                        type="button"
                        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)]"
                        onClick={() => {
                          const w = parseFloat(form.bodyWeightKg.replace(",", "."))
                          const next = suggestedWaterGoalMlFromWeightKg(w)
                          setForm((p) => ({ ...p, waterGoalMl: String(next) }))
                        }}
                      >
                        Calcular según mi perfil
                      </button>
                    </div>
                    <p id="water-profile-calc-hint" className="text-[10px] leading-snug text-[var(--color-text-secondary)]">
                      Aplica <span className="font-medium text-[var(--color-text-primary)]">peso (kg) × 32 ml</span> y
                      rellena la meta (entre 1200 y 5000 ml sugerido; puedes ajustarla después dentro de 500–8000 ml).
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="water-bottle-ml">Capacidad de tu botellita (ml)</Label>
                      <Input
                        id="water-bottle-ml"
                        type="number"
                        min={100}
                        max={5000}
                        inputMode="numeric"
                        value={form.waterBottleMl}
                        onChange={(e) => setForm((p) => ({ ...p, waterBottleMl: e.target.value }))}
                        aria-describedby="water-bottle-hint"
                      />
                      <p id="water-bottle-hint" className="text-[10px] leading-snug text-[var(--color-text-secondary)]">
                        «+1 Botellita» en la tarjeta suma <span className="font-medium tabular-nums text-[var(--color-text-primary)]">{form.waterBottleMl || "—"}</span> ml en cada toque.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {([500, 750, 1000] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]"
                            onClick={() => setForm((p) => ({ ...p, waterBottleMl: String(n) }))}
                          >
                            {n} ml
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="water-glass-ml">Vaso extra (ml)</Label>
                      <Input
                        id="water-glass-ml"
                        type="number"
                        min={50}
                        max={1000}
                        inputMode="numeric"
                        value={form.waterGlassMl}
                        onChange={(e) => setForm((p) => ({ ...p, waterGlassMl: e.target.value }))}
                        aria-describedby="water-glass-hint"
                      />
                      <p id="water-glass-hint" className="text-[10px] leading-snug text-[var(--color-text-secondary)]">
                        Por defecto 250 ml; «+ Vaso extra» suma exactamente estos ml.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="habit-domain">Dominio</Label>
                      <Select
                        value={form.domainKey}
                        onValueChange={(v) => setForm((p) => ({ ...p, domainKey: v as OperationalDomain }))}
                      >
                        <SelectTrigger id="habit-domain">
                          <SelectValue placeholder="Elegir" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(domainLabels) as OperationalDomain[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              {domainLabels[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="habit-metric-type">Métrica de éxito</Label>
                      <Select
                        value={form.successMetricType}
                        onValueChange={(v) => setForm((p) => ({ ...p, successMetricType: v as HabitSuccessMetricType }))}
                      >
                        <SelectTrigger id="habit-metric-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METRIC_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="habit-metric-target">{metricTargetLabel(form.successMetricType)}</Label>
                    <Input
                      id="habit-metric-target"
                      placeholder={metricTargetPlaceholder(form.successMetricType)}
                      value={form.successMetricTarget}
                      onChange={(e) => setForm((p) => ({ ...p, successMetricTarget: e.target.value }))}
                      disabled={form.successMetricType === "si_no"}
                      className={cn(form.successMetricType === "si_no" && "opacity-60")}
                    />
                    {form.successMetricType === "si_no" && (
                      <p className="text-xs text-[var(--color-text-secondary)]">El éxito es marcar el hábito como hecho en el día.</p>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4 border-t border-[var(--color-border)] pt-5" aria-labelledby="habit-rhythm">
              <h3 id="habit-rhythm" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                Ritmo
              </h3>
              {form.isWaterTracking ? (
                <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface))] p-3">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-accent-health)]" aria-hidden />
                    Seguimiento automático
                  </p>
                  <p className="m-0 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                    No hay disparador manual: el día se mide en la misma zona horaria que tu agenda Órvita. En la misión de
                    hidratación verás avisos de ritmo si vas por debajo de lo esperado o si queda poco tiempo para cerrar
                    la meta de ml.
                  </p>
                  <p className="m-0 rounded-md bg-[var(--color-surface-alt)] px-2 py-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">Referencia interna:</span>{" "}
                    {WATER_SYSTEM_TRIGGER_OR_TIME}
                  </p>
                  <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">
                    Frecuencia: <span className="font-medium text-[var(--color-text-primary)]">diario</span> · Días:{" "}
                    <span className="font-medium text-[var(--color-text-primary)]">todos (L–D)</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="habit-session-mins">Duración estimada por sesión (min)</Label>
                      <Input
                        id="habit-session-mins"
                        type="number"
                        min={0}
                        max={24 * 60}
                        inputMode="numeric"
                        value={form.sessionDurationMinutes}
                        onChange={(e) => setForm((p) => ({ ...p, sessionDurationMinutes: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="habit-trigger">Trigger / hora</Label>
                      <Input
                        id="habit-trigger"
                        placeholder="ej. Tras el café · 07:15 · Antes de abrir el inbox"
                        value={form.triggerOrTime}
                        onChange={(e) => setForm((p) => ({ ...p, triggerOrTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  {form.successMetricType === "si_no" ? (
                    <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--color-accent-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-primary)_5%,var(--color-surface))] p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="habit-intraday-si-no"
                          checked={form.intradaySiNoProgress}
                          onCheckedChange={(v) =>
                            setForm((p) => ({ ...p, intradaySiNoProgress: v === true }))
                          }
                        />
                        <div className="min-w-0 space-y-1">
                          <Label htmlFor="habit-intraday-si-no" className="cursor-pointer text-sm font-medium leading-snug">
                            Progreso durante el día (varios chequeos)
                          </Label>
                          <p className="m-0 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                            Definí cuántas veces querés registrar Sí/No hoy; el stack los muestra arriba (no en «sin hora»).
                            El botón hecho del día sigue siendo la base hasta activar checkpoints finos.
                          </p>
                        </div>
                      </div>
                      {form.intradaySiNoProgress ? (
                        <div className="ml-7 space-y-1.5 border-t border-[color-mix(in_srgb,var(--color-accent-primary)_18%,var(--color-border))] pt-3">
                          <Label htmlFor="habit-intraday-target" className="text-[12px] font-medium">
                            Chequeos objetivo por día
                          </Label>
                          <Input
                            id="habit-intraday-target"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={24}
                            value={form.intradaySiNoTargetChecks}
                            onChange={(e) => setForm((p) => ({ ...p, intradaySiNoTargetChecks: e.target.value }))}
                            className="max-w-[8rem]"
                          />
                          <p className="m-0 text-[10px] text-[var(--color-text-secondary)]">Entre 1 y 24 (se guarda en la nube con el hábito).</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="habit-frequency">Frecuencia</Label>
                      <Select
                        value={form.frequency}
                        onValueChange={(v) => setForm((p) => ({ ...p, frequency: v as "diario" | "semanal" }))}
                      >
                        <SelectTrigger id="habit-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diario (días elegidos)</SelectItem>
                          <SelectItem value="semanal">Semanal (días elegidos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-accent-health)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface))] p-3">
                      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-accent-health)]" aria-hidden />
                        Vista semanal
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                        {sessionsPerWeek === 0
                          ? "Elige al menos un día para estimar tiempo."
                          : `${sessionsPerWeek} sesión${sessionsPerWeek === 1 ? "" : "es"} × ${sessionMins || "—"} min`}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        Compromiso aproximado:{" "}
                        <span className="font-semibold text-[var(--color-accent-health)]">
                          {sessionsPerWeek === 0 || !sessionMins ? "—" : formatWeeklyMinutes(weeklyMinutes)}
                        </span>{" "}
                        / semana
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Días activos</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_LETTERS.map((day) => {
                        const on = form.days.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const next = on ? prev.days.filter((d) => d !== day) : [...prev.days, day]
                                const order = [...DAY_LETTERS]
                                next.sort(
                                  (a, b) =>
                                    order.indexOf(a as (typeof DAY_LETTERS)[number]) -
                                    order.indexOf(b as (typeof DAY_LETTERS)[number]),
                                )
                                return { ...prev, days: next }
                              })
                            }
                            className={cn(
                              "min-h-[40px] min-w-[40px] rounded-full border text-xs font-semibold transition-colors",
                              on
                                ? "border-[var(--color-accent-health)] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[var(--color-text-primary)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]",
                            )}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>

            {!form.isWaterTracking ? (
            <section className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
              <Checkbox
                id="habit-super"
                checked={form.superhabit}
                onCheckedChange={(c) => setForm((p) => ({ ...p, superhabit: c === true }))}
                disabled={!editing && superhabitCount >= 2 && !form.superhabit}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="habit-super" className="cursor-pointer text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Superhábito (máx. 2 en el stack)
                </Label>
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Órvita prioriza estos hábitos en narrativas y riesgo de ruptura. Úsalos solo para lo que realmente sostiene tu semana.
                </p>
              </div>
            </section>
            ) : null}
          </div>

          <DialogFooter className="w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {editing && onDeleteHabit ? (
              <button
                type="button"
                disabled={!canSave || deleting}
                onClick={() => void handleDelete()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--color-accent-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_6%,var(--color-surface))] px-4 text-sm font-medium text-[var(--color-accent-danger)] transition-opacity hover:bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-45 sm:order-first"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                Eliminar hábito
              </button>
            ) : (
              <span className="hidden sm:block sm:flex-1" aria-hidden />
            )}
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:opacity-45"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSave || deleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent-health)] px-5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Target className="h-4 w-4 opacity-90" aria-hidden />
                {editing
                  ? form.isWaterTracking
                    ? "Guardar meta y botellita"
                    : "Guardar rediseño del hábito"
                  : "Añadir al stack estratégico"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
