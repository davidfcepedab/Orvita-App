"use client"

import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import TrainingOperationsV3 from "@/app/components/orbita-v3/training/TrainingOperationsV3"

export default function SaludDashboardV3() {
  return (
    <div className="space-y-8 pb-24">
      <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(167,243,208,0.45),rgba(199,210,254,0.35),rgba(255,255,255,0.96))] p-8 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Salud</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          Physical Operations Center
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Entrada canonica para recuperar estado fisico, energia, volumen de entrenamiento y adherencia diaria.
        </p>
      </div>

      <HealthOperationsV3 />
      <TrainingOperationsV3 />
    </div>
  )
}