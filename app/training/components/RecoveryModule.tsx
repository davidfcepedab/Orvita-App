"use client"

import { motion } from "framer-motion"
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  HeartPulse,
  Moon,
  Sparkles,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type HrvPoint = { label: string; hrv: number }

type Props = {
  readinessScore: number
  readinessLabel: string
  sleepHours: number | null
  hrvSeries: HrvPoint[]
  plannedSession: string
  sessionFocus: string
  hasHevy: boolean
  onStartProtocol: () => void
  onOpenAgenda: () => void
  onSkipSession: () => void
  onRestDay: () => void
  loading?: boolean
}

export function RecoveryModule({
  readinessScore,
  readinessLabel,
  sleepHours,
  hrvSeries,
  plannedSession,
  sessionFocus,
  hasHevy,
  onStartProtocol,
  onOpenAgenda,
  onSkipSession,
  onRestDay,
  loading,
}: Props) {
  const chartData = hrvSeries.length ? hrvSeries : [{ label: "—", hrv: 0 }]
  const sleepLabel = sleepHours != null ? `${sleepHours.toFixed(1)} h` : "Sin lectura"

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Readiness & Recovery</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            <Activity className="h-3 w-3" aria-hidden />
            Bio-sync
          </span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">Readiness</p>
            <p className="m-0 mt-1 text-5xl font-bold tracking-tighter text-slate-900">{loading ? "—" : readinessScore}</p>
            <p className="m-0 mt-1 text-sm text-slate-500">{readinessLabel}</p>
          </div>
          <div className="text-right">
            <p className="m-0 flex items-center justify-end gap-1 text-xs text-slate-500">
              <Moon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              Sueño
            </p>
            <p className="m-0 mt-1 text-lg font-semibold tracking-tight text-slate-900">{sleepLabel}</p>
          </div>
        </div>
        <div className="mt-5 h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="hrvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin - 8", "dataMax + 8"]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
                }}
                formatter={(value) => {
                  const v = typeof value === "number" ? value : Number(value)
                  return [`${Math.round(v)} ms`, "HRV"]
                }}
              />
              <Area type="monotone" dataKey="hrv" stroke="#3b82f6" strokeWidth={2} fill="url(#hrvFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="m-0 mt-2 text-center text-[11px] text-slate-400">
          <HeartPulse className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-slate-400" aria-hidden />
          Variabilidad cardíaca (últimos días con datos)
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.05 }}
        className="rounded-[32px] bg-slate-900 p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300">Misión de hoy</p>
            <p className="m-0 mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{plannedSession}</p>
            <p className="m-0 mt-2 max-w-[20rem] text-sm leading-relaxed text-slate-300">{sessionFocus}</p>
          </div>
          <Sparkles className="h-6 w-6 shrink-0 text-blue-400" aria-hidden />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onStartProtocol}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
          >
            {hasHevy ? "Iniciar protocolo" : "Conectar y entrenar"}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenAgenda}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Agenda
            </button>
            <button
              type="button"
              onClick={onSkipSession}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Ajustar sesión
            </button>
          </div>
          <button
            type="button"
            onClick={onRestDay}
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-white/10 bg-transparent px-3 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            Descanso / movilidad
          </button>
        </div>
      </motion.div>
    </div>
  )
}
