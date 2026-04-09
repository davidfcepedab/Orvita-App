"use client"

import { useMemo, useState } from "react"

import { getOrbitaHomeMock } from "@/app/home/_lib/orbita-home-mock"
import { StrategicHeader } from "@/app/home/_components/StrategicHeader"
import { CriticalAlerts } from "@/app/home/_components/CriticalAlerts"
import { CapitalOperativoPanel } from "@/app/home/_components/CapitalOperativoPanel"
import { PredictiveStrategic } from "@/app/home/_components/PredictiveStrategic"
import { SmartActionsSection } from "@/app/home/_components/SmartActionsSection"
import { MiniWidgets } from "@/app/home/_components/MiniWidgets"
import type { SmartAction } from "@/app/home/_lib/orbita-home-types"

export default function HomePage() {
  const model = useMemo(() => getOrbitaHomeMock(), [])
  const [isGenerating, setIsGenerating] = useState(false)

  async function generateAiAnalysis() {
    setIsGenerating(true)
    try {
      // TODO (backend IA): aquí se conectará con tu endpoint de análisis.
      // Ejemplo futuro:
      // await fetch("/api/ai/orbita/home-analysis", { method: "POST" })
      await new Promise((r) => setTimeout(r, 900))
    } finally {
      setIsGenerating(false)
    }
  }

  async function resolveAlertWithAi(_alertId: string) {
    // TODO (backend IA): resolver alerta (plan + acción) y devolver:
    // - decisiones sugeridas
    // - cambios propuestos en agenda
    // - recortes/cobros recomendados
    await new Promise((r) => setTimeout(r, 600))
  }

  async function oneClickAction(_alertId: string) {
    // TODO (backend): ejecutar acción directa (e.g. crear bloque de recuperación / recorte de gasto / recordatorio de cobro).
    await new Promise((r) => setTimeout(r, 350))
  }

  async function onSmartAction(id: string, action: SmartAction["primaryAction"]) {
    // TODO (backend): ejecutar / agendar / ignorar y persistir el estado.
    // - Ejecutar: crear tarea operacional + activar modo (p.ej. "modo caja")
    // - Agendar: insertar bloque en agenda
    // - Ignorar: registrar feedback para afinar el modelo
    void id
    void action
    await new Promise((r) => setTimeout(r, 450))
  }

  return (
    <div className="relative">
      {/* Fondo sutil “centro de mando” */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/10 via-emerald-500/6 to-rose-500/10 blur-3xl" />
        <div className="absolute top-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-emerald-500/8 via-sky-500/6 to-transparent blur-3xl" />
      </div>

      <StrategicHeader model={model} onGenerateAi={generateAiAnalysis} isGenerating={isGenerating} />

      <main className="pt-6">
        <CriticalAlerts alerts={model.alerts} onOneClickAction={oneClickAction} onResolveWithAi={resolveAlertWithAi} />

        <CapitalOperativoPanel model={model} formatCOP={model.formatCOP} />

        <PredictiveStrategic
          points={model.predictive.points30d}
          insights={model.predictive.insights}
          onRequestAiRefresh={generateAiAnalysis}
        />

        <SmartActionsSection actions={model.smartActions} onAction={onSmartAction} />

        <MiniWidgets
          decisions={model.widgets.decisions}
          agendaToday={model.widgets.agendaToday}
          habits={model.widgets.habits}
        />
      </main>
    </div>
  )
}

