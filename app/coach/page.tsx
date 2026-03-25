"use client"

import { useRouter } from "next/navigation"
import {
  BriefcaseBusiness,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Clock,
} from "lucide-react"

const COACH_METRICS = [
  { label: "Disciplina", value: 70, unit: "%", icon: Target },
  { label: "Momentum", value: 82, unit: "%", icon: TrendingUp },
  { label: "Energía Pro", value: 75, unit: "%", icon: Zap },
  { label: "Horas Deep Work", value: 3.5, unit: "h", icon: Clock },
]

const FOCUS_AREAS = [
  { label: "Estrategia Q2", progress: 60, color: "var(--accent-agenda-strong)" },
  { label: "Habilidades técnicas", progress: 45, color: "var(--accent-health-strong)" },
  { label: "Red de contactos", progress: 30, color: "var(--accent-finance-strong)" },
]

export default function CoachPage() {
  const router = useRouter()

  return (
    <div className="p-4 pb-28 space-y-4">
      {/* Hero */}
      <div
        className="relative rounded-3xl p-6 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #C7D2FE 100%)",
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
        />

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-agenda-strong)" }}
          >
            <BriefcaseBusiness size={20} color="white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-600 font-medium">
              Coach — Profesional
            </p>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#1E1B4B" }}
            >
              Rendimiento Pro
            </h1>
          </div>
        </div>

        <p className="text-sm text-indigo-700 opacity-80 leading-relaxed">
          Disciplina ejecutiva · Deep work · Progreso estratégico
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {COACH_METRICS.map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color: "var(--accent-agenda-strong)" }} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--accent-agenda-strong)" }}
            >
              {value}
              <span className="text-base font-normal ml-1 text-gray-400">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Áreas de foco */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={16} style={{ color: "var(--accent-agenda-strong)" }} />
          <h2 className="text-sm font-semibold text-gray-700">Áreas de Foco</h2>
        </div>
        {FOCUS_AREAS.map(({ label, progress, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{label}</span>
              <span style={{ color }}>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/checkin")}
        className="w-full py-4 rounded-2xl font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
      >
        Check-In Profesional
      </button>
    </div>
  )
}
