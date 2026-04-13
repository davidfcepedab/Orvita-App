"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { StrategicHeader } from "@/app/home/_components/StrategicHeader"
import { CriticalAlerts } from "@/app/home/_components/CriticalAlerts"
import { HeroOperativoWidget } from "@/app/home/_components/HeroOperativoWidget"
import { OperationalTodayWidget } from "@/app/home/_components/OperationalTodayWidget"
import { CapitalOperativoPanel } from "@/app/home/_components/CapitalOperativoPanel"
import { PredictiveStrategic } from "@/app/home/_components/PredictiveStrategic"
import { SmartActionsSection } from "@/app/home/_components/SmartActionsSection"
import { MiniWidgets } from "@/app/home/_components/MiniWidgets"
import type { OrbitaHomeModel, SmartAction } from "@/app/home/_lib/orbita-home-types"
import { isAppMockMode } from "@/lib/checkins/flags"

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function HomePage() {
  const appIsMock = isAppMockMode()
  const [model, setModel] = useState<OrbitaHomeModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusLine, setStatusLine] = useState<string | null>(null)
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null)
  const [pendingSmartActionId, setPendingSmartActionId] = useState<string | null>(null)

  const authedFetch = useMemo(() => {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isAppMockMode()) return fetch(input, init)
      const { createBrowserClient } = await import("@/lib/supabase/browser")
      const supabase = createBrowserClient() as {
        auth?: {
          getSession?: () => Promise<{ data?: { session?: { access_token?: string } } }>
        }
      }
      const session = (await supabase?.auth?.getSession?.())?.data?.session
      const token = session?.access_token
      if (!token) {
        // Sin token, intentamos igual (rutas mock / públicas) pero marcamos estado.
        return fetch(input, init)
      }
      const headers = new Headers(init?.headers)
      headers.set("authorization", `Bearer ${token}`)
      return fetch(input, { ...init, headers })
    }
  }, [])

  const loadHome = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent)
      try {
        if (!silent) setIsLoading(true)
        const res = await authedFetch("/api/orbita/home", { method: "GET" })
        if (!res.ok) throw new Error(`home GET ${res.status}`)
        const json = (await res.json()) as { success?: boolean; data?: OrbitaHomeModel; error?: string }
        if (!json?.success || !json.data) throw new Error(json?.error || "home payload inválido")
        setModel(json.data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error desconocido"
        setStatusLine(`No pudimos cargar Inicio: ${msg}`)
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [authedFetch],
  )

  useEffect(() => {
    void loadHome()
  }, [loadHome])

  async function generateAiAnalysis() {
    setIsGenerating(true)
    try {
      setStatusLine("Generando análisis…")
      const res = await authedFetch("/api/orbita/home/analysis", { method: "POST" })
      if (!res.ok) throw new Error(`analysis POST ${res.status}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: { generatedAt?: string; insights?: OrbitaHomeModel["predictive"]["insights"] }
        error?: string
      }
      if (!json?.success || !json.data?.insights) throw new Error(json?.error || "analysis payload inválido")
      setModel((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          predictive: {
            ...prev.predictive,
            insights: json.data!.insights!,
          },
        }
      })
      setStatusLine("Análisis actualizado.")
      if (!appIsMock) await loadHome({ silent: true })
    } finally {
      setIsGenerating(false)
    }
  }

  async function resolveAlertWithAi(alertId: string) {
    setPendingAlertId(alertId)
    setStatusLine("Resolviendo con IA…")
    try {
      const res = await authedFetch("/api/orbita/home/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "alert_ai_resolve", id: alertId }),
      })
      if (!res.ok) throw new Error(`action POST ${res.status}`)
      setModel((prev) => (prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== alertId) } : prev))
      setStatusLine("Alerta resuelta.")
      if (!appIsMock) await loadHome({ silent: true })
    } finally {
      setPendingAlertId(null)
    }
  }

  async function oneClickAction(alertId: string) {
    setPendingAlertId(alertId)
    setStatusLine("Ejecutando acción…")
    try {
      const res = await authedFetch("/api/orbita/home/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "alert_one_click", id: alertId }),
      })
      if (!res.ok) throw new Error(`action POST ${res.status}`)
      setModel((prev) => (prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== alertId) } : prev))
      setStatusLine("Acción aplicada.")
      if (!appIsMock) await loadHome({ silent: true })
    } finally {
      setPendingAlertId(null)
    }
  }

  async function onSmartAction(id: string, action: SmartAction["primaryAction"]) {
    setPendingSmartActionId(id)
    setStatusLine(`${action}…`)
    try {
      const res = await authedFetch("/api/orbita/home/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "smart_action", id, action }),
      })
      if (!res.ok) throw new Error(`action POST ${res.status}`)
      setModel((prev) => (prev ? { ...prev, smartActions: prev.smartActions.filter((a) => a.id !== id) } : prev))
      setStatusLine(`Acción registrada: ${action}.`)
      if (!appIsMock) await loadHome({ silent: true })
    } finally {
      setPendingSmartActionId(null)
    }
  }

  return (
    <div className="relative">
      {/* Fondo sutil “centro de mando” */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/10 via-emerald-500/6 to-rose-500/10 blur-3xl" />
        <div className="absolute top-24 right-[-120px] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-emerald-500/8 via-sky-500/6 to-transparent blur-3xl" />
      </div>

      {statusLine ? (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="rounded-xl border border-white/10 bg-orbita-surface px-3 py-2 text-sm text-[var(--color-text-secondary)]">
            {statusLine}
          </div>
        </div>
      ) : null}

      {model ? <StrategicHeader model={model} onGenerateAi={generateAiAnalysis} isGenerating={isGenerating} /> : null}

      <main className="pt-6">
        {isLoading && !model ? (
          <section className="mx-auto max-w-6xl px-4">
            <div className="rounded-2xl border border-white/10 bg-orbita-surface p-4 text-sm text-[var(--color-text-secondary)]">
              Cargando Inicio…
            </div>
          </section>
        ) : null}

        {model ? (
          <CriticalAlerts
            alerts={model.alerts}
            onOneClickAction={oneClickAction}
            onResolveWithAi={resolveAlertWithAi}
            pendingAlertId={pendingAlertId}
          />
        ) : null}

        {model ? <HeroOperativoWidget model={model} /> : null}

        {model ? <OperationalTodayWidget /> : null}

        {model ? <CapitalOperativoPanel model={model} formatCOP={formatCOP} /> : null}

        {model ? (
          <PredictiveStrategic
            points={model.predictive.points30d}
            insights={model.predictive.insights}
            onRequestAiRefresh={generateAiAnalysis}
            isRefreshing={isGenerating}
          />
        ) : null}

        {model ? (
          <SmartActionsSection
            actions={model.smartActions}
            onAction={onSmartAction}
            pendingActionId={pendingSmartActionId}
          />
        ) : null}

        {model ? (
          <MiniWidgets
            decisions={model.widgets.decisions}
            agendaToday={model.widgets.agendaToday}
            habits={model.widgets.habits}
          />
        ) : null}
      </main>
    </div>
  )
}

