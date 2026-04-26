"use client"

import { useMemo } from "react"
import HealthOperationsV3 from "@/app/components/orbita-v3/health/HealthOperationsV3"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { useTraining } from "@/src/modules/training/useTraining"
import { appleDaySignalsFromHealthMetric } from "@/lib/health/appleHevyRelation"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { buildPlanVsExecution, buildTrainingReadiness } from "@/lib/training/trainingOperationalDerivations"
import { buildSaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { HeroDecisionCard } from "@/app/components/orbita-v3/salud/HeroDecisionCard"
import { SaludInsightSection } from "@/app/components/orbita-v3/salud/SaludInsightSection"
import AppleHealthLuxurySection from "@/app/components/orbita-v3/salud/AppleHealthLuxurySection"

function formatSyncSummary(latestObservedAt: string | null | undefined, stale: boolean): string {
  if (!latestObservedAt) return "Apple Health: sin lectura reciente."
  if (stale) return `Apple Health: sync desactualizado · ${new Intl.DateTimeFormat("es-LA", { dateStyle: "short", timeStyle: "short" }).format(new Date(latestObservedAt))}`
  return `Apple Health: al día · ${new Intl.DateTimeFormat("es-LA", { dateStyle: "short", timeStyle: "short" }).format(new Date(latestObservedAt))}`
}

export default function SaludDashboardV3() {
  const salud = useSaludContext()
  const autoHealth = useHealthAutoMetrics()
  const { days, todayState } = useTraining()
  const todayIso = agendaTodayYmd()

  const staleSync = useMemo(() => {
    if (!autoHealth.latest?.observed_at) return false
    const ageMs = Date.now() - new Date(autoHealth.latest.observed_at).getTime()
    return Number.isFinite(ageMs) && ageMs > 36 * 60 * 60 * 1000
  }, [autoHealth.latest?.observed_at])

  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(autoHealth.latest), [autoHealth.latest])
  const readiness = useMemo(() => buildTrainingReadiness(appleSignals, days), [appleSignals, days])
  const planVsExecution = useMemo(() => buildPlanVsExecution(days, todayState, todayIso), [days, todayState, todayIso])
  const brief = useMemo(
    () =>
      buildSaludDecisionBrief({
        salud,
        latest: autoHealth.latest,
        readiness,
        plan: planVsExecution,
        todayState,
        staleSync,
      }),
    [salud, autoHealth.latest, readiness, planVsExecution, todayState, staleSync],
  )

  const syncSummary = useMemo(
    () => formatSyncSummary(autoHealth.latest?.observed_at ?? null, staleSync),
    [autoHealth.latest?.observed_at, staleSync],
  )

  if (salud.loading) {
    return (
      <main className="mx-auto max-w-[min(72rem,calc(100vw-1.5rem))] px-1 py-2 text-sm text-[var(--color-text-secondary)]">
        Cargando brief de salud…
      </main>
    )
  }

  if (salud.error) {
    return (
      <main className="mx-auto max-w-[min(72rem,calc(100vw-1.5rem))] px-1 py-2 text-sm text-[var(--color-accent-finance)]">
        {salud.error}
      </main>
    )
  }

  return (
    <main
      className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))] space-y-4"
      aria-label="Salud — decisión, Apple Health y operativo"
    >
      <HeroDecisionCard brief={brief} syncSummary={syncSummary} />
      <SaludInsightSection brief={brief} />

      <AppleHealthLuxurySection
        salud={salud}
        latest={autoHealth.latest}
        loading={autoHealth.loading}
        onRefresh={autoHealth.refetch}
      />

      <section className="space-y-3 px-0.5 sm:px-0">
        <HealthOperationsV3
          salud={salud}
          latest={autoHealth.latest}
          timeline={autoHealth.timeline}
          analytics={autoHealth.analytics}
          healthMetricsLoading={autoHealth.loading}
          layout="full"
        />
      </section>
    </main>
  )
}
