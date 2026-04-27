"use client"

import { motion } from "framer-motion"
import { Activity, Brain, CalendarDays, ChevronRight, HeartPulse, Moon, Sparkles } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/src/components/ui/dialog"

const HrvAreaChart = dynamic(() => import("./charts/HrvAreaChart").then((m) => m.HrvAreaChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-[10px] text-slate-400">
      Cargando gráfico…
    </div>
  ),
})

export type HrvPoint = { label: string; hrv: number }

export type RecoveryAdvisorProps = {
  statusLabel: string
  cnsLevel: string
  intraChoG: string
  hypertrophyHint: string
  quote: string
  setsDone: number
  streakDays: number
}

export type RecoverySyncChips = { apple: boolean; hevy: boolean; manual: boolean }

type Props = {
  readinessScore: number
  readinessLabel: string
  sleepHours: number | null
  hrvSeries: HrvPoint[]
  hrvHasData: boolean
  plannedSession: string
  sessionFocus: string
  onStartProtocol: () => void
  onOpenAgenda: () => void
  /** Desde modal de descanso (p. ej. con `origen=descanso` en query). Por defecto `onOpenAgenda`. */
  onOpenAgendaFromRestModal?: () => void
  onReprogramSession: () => void
  onConfirmRestDay: () => void
  loading?: boolean
  advisor: RecoveryAdvisorProps
  /** Fuentes reales de señales (Apple Health, Hevy, check-in manual). */
  syncChips?: RecoverySyncChips
}

export function RecoveryModule({
  readinessScore,
  readinessLabel,
  sleepHours,
  hrvSeries,
  hrvHasData,
  plannedSession,
  sessionFocus,
  onStartProtocol,
  onOpenAgenda,
  onOpenAgendaFromRestModal,
  onReprogramSession,
  onConfirmRestDay,
  loading,
  advisor,
  syncChips,
}: Props) {
  const [restOpen, setRestOpen] = useState(false)
  const chartData = hrvHasData && hrvSeries.length ? hrvSeries : []
  const sleepLabel = sleepHours != null ? `${sleepHours.toFixed(1)} h` : "Sin lectura"

  const shortFocus = sessionFocus.length > 140 ? `${sessionFocus.slice(0, 137)}…` : sessionFocus

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recuperación y lecturas</p>
          {syncChips ? (
            <div className="flex flex-wrap justify-end gap-1">
              <RecoverySyncChip on={syncChips.apple} label="Apple Health" />
              <RecoverySyncChip on={syncChips.hevy} label="Hevy" />
              <RecoverySyncChip on={syncChips.manual} label="Registro del día" />
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <Activity className="h-3 w-3" aria-hidden />
              Sin Apple, Hevy ni registro
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Preparación corporal</p>
            <p className="m-0 mt-0.5 text-4xl font-bold tracking-tighter text-slate-900">{loading ? "—" : readinessScore}</p>
            <p className="m-0 mt-0.5 text-xs text-slate-500">{readinessLabel}</p>
          </div>
          <div className="text-right">
            <p className="m-0 flex items-center justify-end gap-1 text-[11px] text-slate-500">
              <Moon className="h-3 w-3 text-slate-400" aria-hidden />
              Sueño
            </p>
            <p className="m-0 mt-0.5 text-base font-semibold tracking-tight text-slate-900">{sleepLabel}</p>
          </div>
        </div>
        <div className="mt-4 h-[130px] w-full">
          {hrvHasData && chartData.length ? (
            <HrvAreaChart data={chartData} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 text-center">
              <HeartPulse className="mb-1 h-5 w-5 text-slate-300" aria-hidden />
              <p className="m-0 text-[11px] leading-snug text-slate-500">
                Sin datos de VFC en los últimos días. Sincroniza Apple Health o el atajo de salud para ver la curva aquí.
              </p>
            </div>
          )}
        </div>
        {!hrvHasData ? null : (
          <p className="m-0 mt-1 text-center text-[10px] text-slate-400">Variabilidad cardíaca (VFC) · últimos registros</p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.04 }}
          className="flex h-full min-h-0 flex-col rounded-[28px] bg-slate-900 p-4 text-white shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-300/95">Misión hoy</p>
              <p className="m-0 mt-1 text-lg font-bold leading-snug tracking-tight sm:text-xl">{plannedSession}</p>
              <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-300">{shortFocus}</p>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-blue-400/90" aria-hidden />
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onStartProtocol}
              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Empezar entreno
              <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onOpenAgenda}
                className="inline-flex min-h-8 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <CalendarDays className="mr-1 h-3 w-3 opacity-80" aria-hidden />
                Calendario
              </button>
              <button
                type="button"
                onClick={onReprogramSession}
                className="inline-flex min-h-8 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Reprogramar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRestOpen(true)}
              className="inline-flex min-h-8 items-center justify-center rounded-xl border border-white/10 px-2 text-[11px] font-medium text-slate-400 transition hover:border-white/20 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Día descanso
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06 }}
          className="flex h-full min-h-0 flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-blue-400">
                <Brain className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Guía del plan</p>
                <p className="m-0 text-xs font-semibold text-slate-800">Estado: {advisor.statusLabel}</p>
              </div>
            </div>
            {syncChips ? (
              <div className="flex flex-wrap gap-1">
                <RecoverySyncChip on={syncChips.apple} label="Apple" />
                <RecoverySyncChip on={syncChips.hevy} label="Hevy" />
                <RecoverySyncChip on={syncChips.manual} label="A mano" />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <AdvisorRow label="Fatiga del sistema nervioso" value={advisor.cnsLevel} valueClass={cnsFatigueToneClass(advisor.cnsLevel)} />
            <AdvisorRow label="Carbos en sesión" value={`${advisor.intraChoG} g`} valueClass="text-blue-600" />
            <AdvisorRow label="Ritmo hipertrofia" value={advisor.hypertrophyHint} valueClass="text-slate-800" />
          </div>
          <p className="m-0 border-t border-slate-100 pt-2 text-[11px] italic leading-relaxed text-slate-600">&ldquo;{advisor.quote}&rdquo;</p>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-blue-600 px-2 py-2.5 text-white">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-wider text-blue-100/90">Sets semana</p>
              <p className="m-0 text-xl font-bold italic tracking-tight">{advisor.setsDone}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-2 py-2.5 text-white">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Racha</p>
              <p className="m-0 text-xl font-bold italic tracking-tight">{advisor.streakDays}d</p>
            </div>
          </div>
        </motion.div>
      </div>

      <Dialog open={restOpen} onOpenChange={setRestOpen}>
        <DialogContent
          showClose
          className="max-w-md gap-0 border-slate-200 bg-white p-0 sm:rounded-2xl [&>button]:text-slate-500 [&>button]:hover:text-slate-800"
        >
          <div className="px-5 pb-2 pt-5 sm:px-6">
            <DialogTitle className="text-base font-bold text-slate-900">Marcar descanso</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-600">
              Marcaremos hoy como descanso. Para mover el entreno a otro hueco, abre el calendario y elige horario; el plan del día se puede ajustar desde ahí.
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => setRestOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                ;(onOpenAgendaFromRestModal ?? onOpenAgenda)()
                setRestOpen(false)
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Ver agenda
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmRestDay()
                setRestOpen(false)
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Confirmar descanso
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Baja = favorable (verde), Media = atención (ámbar), Alta = exigencia alta / peor recuperación (rojo). */
function cnsFatigueToneClass(level: string): string {
  if (level === "Baja") return "text-emerald-600"
  if (level === "Media") return "text-amber-600"
  return "text-rose-600"
}

function AdvisorRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-xs font-bold ${valueClass}`}>{value}</span>
    </div>
  )
}

function RecoverySyncChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${
        on ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {label}
      {!on ? " · —" : ""}
    </span>
  )
}
